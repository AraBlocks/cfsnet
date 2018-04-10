'use strict'

const { createCFSSignalHub } = require('./signalhub')
const { normalizeCFSKey } = require('./key')
const createWebRTCSwarm = require('webrtc-swarm')
const { createSHA256 } = require('./sha256')
const { EventEmitter } = require('events')
const { createCFS } = require('./create')
const randombytes = require('randombytes')
const Connections = require('connections')
const isBrowser = require('is-browser')
const discovery = require('discovery-swarm')
const mutexify = require('mutexify')
const drives = require('./drives')
const crypto = require('./crypto')
const debug = require('debug')('littlstar:cfs:swarm')
const lucas = require('lucas-series')
const ipify = require('ipify')
const pify = require('pify')
const pump = require('pump')
const ip = require('ip')

const {
  createCFSWebSocketServer,
  createCFSWebSocket,
} = require('./ws')

const kMaxWebSocketConnectRetries = 5
const kTopicLeaveOp = 'leave'
const kTopicJoinOp = 'join'

/**
 * Creates a CFS discovery network swarm
 *
 * @public
 * @param {?(Object)} opts
 * @param {?(Object)} opts.cfs
 * @param {?(Object)} opts.key
 * @param {?(Object)} opts.id
 * @param {?(Object)} opts.download
 * @param {?(Object)} opts.upload
 * @param {?(Object)} opts.dht
 * @param {?(Object)} opts.dns
 * @return {HyperDiscovery}
 */
async function createCFSDiscoverySwarm({
  cfs = null,
  key = null,
  id = null,
  maxConnections = 60,
  signalhub = null,
  download = true,
  upload = true,
  live = true,
  port = 0,
  wrtc = null, // optional WebRTC implementation for node
  dns = {},
  dht = {},
  ws = { bootstrap: null, port: 0 },
} = {}) {
  id = id ? id : cfs ? cfs.identifier : null
  key = key ? normalizeCFSKey(key) : cfs ? cfs.key.toString('hex') : null
  cfs = cfs || await createCFS({id, key})

  if (!id) {
    debug("swarm: Waiting for identifier", cfs.identifier)
    id = await new Promise((resolve) => cfs.once('id', resolve))
  }

  const ping = 'ws-ping'
  const ack = 'ws-ack'

  const hash = crypto.hash(Buffer.concat([cfs.identifier, cfs.key]))
  const keyPair = crypto.generateKeyPair(Buffer.from(hash.slice(0, 64)))

  const discoveryKey = crypto.generateDiscoveryKey(keyPair.publicKey)
  const discoveryId = randombytes(32)
  const lock = { heartbeat: mutexify(), pingpong: mutexify() }
  const topic = await createCFSSignalHub({discoveryKey: cfs.identifier})
  const uid = discoveryId.toString('hex')

  let swarm = null

  const hub = await createCFSSignalHub({discoveryKey})
  debug("topic: broadcast: %s", kTopicJoinOp)

  try { topic.broadcast(kTopicJoinOp) }
  catch (err) { debug("topic: broadcast: error:", err) }

  cfs.once('close', onexit)
  process.once('beforeExit', onexit)

  function onexit() {
    try { topic.broadcast(kTopicLeaveOp) }
    catch (err) { debug("topic: broadcast: error:", err) }
  }

  if (false == isBrowser) {
    swarm = discovery({
      maxConnections, stream,
      id: discoveryId, hash: false,

      dns: {
        ttl: dns.ttl || 30,
        limit: dns.limit || 1000,
        loopback: null != dns.loopback ? dns.loopback : false,
        multicast: null != dns.multicast ? dns.multicast : true,
        domain: dns.domain || 'cfs.local',
        server: dns.server || [
          '127.0.0.1',

          // @TODO(werle): move these to `cfs-cli'
          'cfa-alpha.us-east-1.littlstar.com',
          'cfa-beta.us-east-1.littlstar.com',
          'cfa-gamma.us-east-1.littlstar.com',
          'dns.us-east-1.littlstar.com',
        ],
      },

      dht: {
        maxPeers: dht.maxPeers || 10000,
        maxTables: dht.maxTables || 10000,
        bootstrap: dht.bootstrap || [
          {host: '127.0.0.1', port: 6881},

          // @TODO(werle): move these to `cfs-cli'
          {host: 'dht.us-east-1.littlstar.com', port: 6881},
          {host: 'cfa-alpha.us-east-1.littlstar.com', port: 6881},
          {host: 'cfa-beta.us-east-1.littlstar.com', port: 6881},
          {host: 'cfa-gamma.us-east-1.littlstar.com', port: 6881},
        ],
      }
    })

    swarm.join(discoveryKey)
    swarm.listen(port || 0, onlisten)

    function onlisten(err) {
      if (err) {
        swarm.listen(0)
      }
    }
  }

  if (null == swarm) {
    // polyfil "swarm"
    swarm = Object.assign(new EventEmitter(), {
      close(cb) {
        process.nextTick(() => this.emit('close'))
        if (cb) { process.nextTick(cb) }
      }
    })
  }

  //if (0) {
  if (false !== ws) {
    if (false == isBrowser) {
      const wss = await createCFSWebSocketServer(ws)
      const wsConnections = Connections(wss)
      wss.setMaxListeners(Infinity)
      swarm.on('close', () => wss.close())
      hub.subscribe(ping).on('data', async (req) => {
        debug("me:", {id: uid})
        debug("ping:", req)
        try {
          const address = ip.address()
          const { port } = wss._server.address()
          const localAddress = address
          const remoteAddress = await ipify()
          const res = { remoteAddress, localAddress, address, port, id: uid }
          hub.broadcast(ack, res)
        } catch (err) {
          debug("ping: error:", err)
        }
      })

      wss.on('connection', (socket) => {
        const { port } = wss._server.address()
        const info = {port, address: 'websocket'}
        wsConnections.add(socket)
        swarm.emit('connection', socket, info)
        socket.pipe(stream()).pipe(socket)
        socket.once('error', (err) => {
          debug("wss: connection: socket: error:", err)
          swarm.emit('error', err)
        })
      })

      wss.on('error', (err) => {
        debug("wss: error:", err)
        swarm.emit('error', err)
      })
    }

    const channel = hub.subscribe(ack)
    const peersSeen = {}
    const connected = []
    const connections = swarm.connections || []
    swarm.connections = connections

    const L = lucas(0)
    let interval = 0

    heartbeat()

    function heartbeat() {
      lock.heartbeat((release) => {
        channel.removeListener('data', onack)
        channel.on('data', onack)
        const { value } = L.next()
        const wait = 500 * value
        debug("heartbeat: wait=%s", wait)
        pingpong() // init ping
        clearInterval(interval)
        interval = setInterval(pingpong, wait)
        setTimeout(release, wait)
      })
    }

    if (ws && ws.bootstrap) {
      ws = Array.isArray(ws.bootstrap) ? ws.bootstrap : [ws.bootstrap]
      for (const bootstrap of ws.bootstrap) {
        await connect(bootstrap)
      }
    }

    async function onack(res) {
      if (uid != res.id) {
        debug("onack")
        clearInterval(interval)
        channel.removeListener('data', onack)
        try { await connect(res) }
        catch (err) { debug("onack: connect: error:", err) }
      }
    }

    async function connect(info, retries) {

      if (null == retries) {
        retries = kMaxWebSocketConnectRetries
      } else if (0 === retries) {
        return heartbeat()
      }

      if (maxConnections && connections.length >= maxConnections) {
        return heartbeat()
      }

      debug("connect:", info)

      if (info && info.port) {
        if (info.remoteAddress) {
          let host = `ws://${info.remoteAddress}:${info.port}`
          try { return await pify(tryConnect)(host) }
          catch (err) { debug("connect: error:", err) }
        }

        if (info.localAddress) {
          let host = `ws://${info.localAddress}:${info.port}`
          try { return await pify(tryConnect)(host) }
          catch (err) { debug("connect: error:", err) }
        }

        if (info.address && info.address != info.localAddress) {
          let host = `ws://${info.address}:${info.port}`
          try { return await pify(tryConnect)(host) }
          catch (err) { debug("connect: error:", err) }
        }

        if (retries && 'number' == typeof retries) {
          const retry = kMaxWebSocketConnectRetries - retries
          const wait = [ ...lucas(retry, kMaxWebSocketConnectRetries) ][retry]
          setTimeout(() => connect(info, --retries), wait)
        }
      }

      async function tryConnect(host, cb) {
        if (connected.includes(host)) {
          return cb(new Error("Already connected"))
        }

        debug("connect: try:", host)
        const socket = await createCFSWebSocket({host})
        socket.once('connect', () => cb(null))
        socket.once('error', (err) => {
          cleanup()
          cb(err)
        })

        socket.on('close', () => {
          cleanup()
          if (0 == connections.length) {
            heartbeat()
          }
        })

        socket.on('connect', () => {
          connected.push(host)
          connections.push(socket)
          swarm.emit('connection', socket, info)
          debug("socket: connect")
          socket.pipe(stream()).pipe(socket)
        })

        function cleanup() {
          connections.splice(connections.indexOf(socket), 1)
          // cool off
          setTimeout(() => {
            connected.splice(connected.indexOf(host), 1)
          }, 3000)
        }
      }
    }
  }

  if (false !== wrtc) {
    // TODO(werle): provide ICE/STUN servers
    const webrtcSwarm = createWebRTCSwarm(hub, { wrtc })
    swarm.on('close', () => { webrtcSwarm.close() })
    webrtcSwarm.on('peer', (peer, id) => {
      debug("webrtc: peer:", id)
      swarm.emit('connection', peer, {id})
      peer.pipe(stream()).pipe(peer).on('error', (err) => {
        debug("webrtc: peer: replicate: error:", err)
      })
    })
  }

  swarm.setMaxListeners(Infinity)
  swarm.on('error', onerror)

  return swarm

  function pingpong() {
    let released = false
    lock.pingpong((release) => {
      debug("pingpong: ", uid)
      try {
        hub.broadcast(ping, {id: uid}, (err) => {
          if (err) { debug("pingpong: error:", err) }
          done()
        })
      } catch (err) {
        debug("pingpong: error:", err)
        release()
      }

      function done() {
        if (!released) { release() }
        released = true
      }
    })
  }

  function onerror(err) {
    debug("error:", err)
  }

  function stream() {
    return cfs.replicate({
      download,
      upload,
      live,
    }).on('error', (err) => {
      swarm.emit('error', err)
    })
  }
}

module.exports = {
  createCFSDiscoverySwarm
}
