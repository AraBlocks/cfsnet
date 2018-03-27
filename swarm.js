'use strict'

const { createCFSSignalHub } = require('./signalhub')
const { createCFSKeyPath } = require('./key-path')
const { normalizeCFSKey } = require('./key')
const { createSHA256 } = require('./sha256')
const { EventEmitter } = require('events')
const { createCFS } = require('./create')
const isBrowser = require('is-browser')
const discovery = require('discovery-swarm')
const drives = require('./drives')
const crypto = require('./crypto')
const debug = require('debug')('littlstar:cfs:swarm')
const pump = require('pump')
const cuid = require('cuid')
const ip = require('ip')

const {
  createCFSWebSocketServer,
  createCFSWebSocket,
} = require('./ws')

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
  dns = {},
  dht = {},
  ws = { port: 0 },
} = {}) {
  id = id ? id : cfs ? cfs.identifier : null
  key = key ? normalizeCFSKey(key) : cfs ? cfs.key.toString('hex') : null
  cfs = cfs || await createCFS({id, key})

  const ping = 'ws-ping'
  const ack = 'ws-ack'

  // @TODO(werle): use swarm key below prior to 1.0.0 release
  //const discoveryKey = id && key ? createSHA256({id, key}) : cfs.discoveryKey
  const discoveryKey = cfs.discoveryKey || crypto.discoveryKey(Buffer.from(cfs.key || key))
  const hub = await createCFSSignalHub({discoveryKey})
  const uid = cuid()
  let swarm = null

  if (false == isBrowser) {
    swarm = discovery({
      maxConnections, stream, hash: false,

      dns: {
        ttl: dns.ttl || 30,
        limit: dns.limit || 1000,
        loopback: null != dns.loopback ? dns.loopback : false,
        multicast: null != dns.multicast ? dns.multicast : true,
        domain: dns.domain || 'cfs.local',
        server: dns.server || [
          '127.0.0.1',
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
    swarm = new EventEmitter()
  }

  if (false !== ws) {
    if (false == isBrowser) {
      const wss = await createCFSWebSocketServer(ws)
      swarm.on('close', () => wss.close())
      hub.subscribe(ping).on('data', (req) => {
        debug("ping:", req)
        try {
          const address = ip.address()
          const { port } = wss._server.address()
          const res = {address, port, id: uid}
          hub.broadcast(ack, res)
        } catch (err) {
          debug("ping: error:", err)
        }
      })

      wss.on('connection', (socket) => {
        const { port } = wss._server.address()
        const info = {port, address: 'websocket'}
        swarm.emit('connection', socket, info)
        socket.pipe(stream()).pipe(socket)
        socket.on('error', (err) => {
          debug("wss: connection: socket: error:", err)
          swarm.emit('error', err)
        })
      })

      wss.on('error', (err) => {
        debug("wss: error:", err)
        swarm.emit('error', err)
      })
    }

    if (isBrowser) {
      const interval = setInterval(pong, 1000)
      const channel = hub.subscribe(ack).on('data', onack)

      async function onack(res) {
        if (uid != res.id) {
          clearInterval(interval)
          channel.removeListener('data', onack)
          const socket = await createCFSWebSocket({host: `ws://${res.address}:${res.port}`})
          socket.on('connect', () => {
            swarm.emit('connection', socket, res)
            debug("onack: sock: connect")
            socket.pipe(stream()).pipe(socket)
          })
        }
      }
    }
  }

  swarm.setMaxListeners(Infinity)
  swarm.on('error', onerror)

  return swarm

  function pong() {
    debug("ping")
    hub.broadcast(ping, {id: uid})
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
