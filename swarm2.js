'use strict'

const Connections = require('connections')
const randombytes = require('randombytes')
const discovery = require('discovery-swarm')
const isBrowser = require('is-browser')
const toBuffer = require('to-buffer')
const lucas = require('lucas-series')
const Batch = require('batch')
const ipify = require('ipify')
const pify = require('pify')
const ip = require('ip')

const { createCFSSignalHub } = require('./signalhub')
const {
  createCFSWebSocketServer,
  createCFSWebSocketStream,
  createCFSWebSocket,
} = require('./ws')

const kCFSDiscoverySwarmWebSocketPort = 6888
const kCFSDiscoverySwarmPort = 6889
const kLucasRetries = [ ...lucas(0, 4) ].map((i) => i*1000)

function noop() {}
function toHex(v) {
  return Buffer.isBuffer(v)
    ? v.toString('hex')
    : toHex(Buffer.from(v, 'hex'))
}

async function createCFSDiscoverySwarm({
  maxConnections = 16,
  stream = noop,
  port = kCFSDiscoverySwarmPort,
  dns = {},
  dht = {},
  tcp = true,
  utp = true,
  ws = { bootstrap: null, port: 0 }
}) {
  const id = randombytes(32)
  const hubs = {}
  const banned = {}
  const signals = {}
  const swarm = discovery({maxConnections, stream, id,
    hash: false,
    tcp: isBrowser ? false : tcp,
    utp: isBrowser ? false : utp,
    dns: false || isBrowser ? false : {
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

    dht: false || isBrowser ? false : {
      maxPeers: dht.maxPeers || 10000,
      maxTables: dht.maxTables || 10000,
      bootstrap: dht.bootstrap || [
        { host: '127.0.0.1', port: 6881 },

        // @TODO(werle): move these to `cfs-cli'
        {host: 'dht.us-east-1.littlstar.com', port: 6881},
        {host: 'cfa-alpha.us-east-1.littlstar.com', port: 6881},
        {host: 'cfa-beta.us-east-1.littlstar.com', port: 6881},
        {host: 'cfa-gamma.us-east-1.littlstar.com', port: 6881},
      ],
    }
  })

  if (false == isBrowser && (tcp || utp)) {
    await new Promise((resolve) => {
      swarm.once('error', onlisten)
      try { swarm.listen(port || 0, onlisten) }
      catch (err) { onlisten(err) }
      function onlisten(err) {
        swarm.removeListener('error', onlisten)
        if (err) { swarm.listen(0, resolve) }
        else { resolve() }
      }
    })
  }

  let wss = null
  if (false !== ws) {
    wss = await createCFSWebSocketServer(Object.assign({}, ws, {server: swarm._tcp || null, port: null}))
    //wss = await createCFSWebSocketServer(ws)
    wss.connections = Connections(wss)
    wss.setMaxListeners(Infinity)
    swarm.on('close', () => wss.close())
    wss._server.on('connection', (socket, req) => {
      const { host } = req.headers
      const address = host.split(':')[0]
      const port = host.split(':')[1]
      const id = req.headers['x-peer-id']
      const discoveryKey = req.headers['x-discovery-key']

      // invalid request
      if (!id || !discoveryKey || !address || !port) {
        return socket.close()
      }

      // already connected
      if (id in signals || id in banned) {
        return socket.close()
      }

      const wStream = createCFSWebSocketStream({socket})
      const signal = accept({id, address, port})
      const channel = Buffer.from(discoveryKey, 'hex')
      const peer = {
        type: 'ws',
        initiator: false,
        id: `${signal.remoteAddress}@${toHex(channel)}`,
        host: signal.remoteAddress,
        port: signal.port,
        channel: channel,
        retries: signal.retries,
      }

      swarm.emit('connection', wStream, peer)
      wStream.pipe(stream(peer)).pipe(wStream)
    })
  }

  const _join = swarm.join.bind(swarm)

  return Object.assign(swarm, {
    join
  })

  function join(name, opts, cb) {
    const batch = new Batch()
    if ('function' == typeof opts) {
      cb = opts
      opts = {}
    }

    if ('string' == typeof name) {
      name = toBuffer(name)
    }

    if (false == isBrowser && (tcp || utp) && (dht || dns)) {
      batch.push((done) => _join(name, opts, done))
    }

    if (false == name in hubs) {
      hubs[toHex(name)] = createCFSSignalHub({ discoveryKey: name })
    }

    if (false !== ws) {
      batch.push(async (done) => {
        const hub = hubs[toHex(name)]
        const address = ip.address()
        const { port } = wss._server.address() || {}
        const localAddress = address
        const remoteAddress = await ipify()
        const peer = signalify({id, port, address, remoteAddress, localAddress})
        process.nextTick(done)
        hub.broadcast('join', peer)
      })
    }

    hubs[toHex(name)].subscribe('join').on('data', async (info) => {
      if (!info) { return }
      if (toHex(id) == toHex(info.id)) { return }
      if (info.id in signals || info.id in banned) { return }

      // store easy signal references
      const signal = accept(info)

      const peer = {
        type: 'ws',
        initiator: true,
        id: `${signal.remoteAddress}@${toHex(name)}`,
        host: signal.remoteAddress,
        port: signal.port,
        channel: Buffer.from(name),
        retries: signal.retries,
      }

      swarm.emit('peer', peer)

      return kick()

      async function kick() {
        let socket = null
        try { socket = await pify(connect)(hostify(signal, 'remoteAddress')) }
        catch (err) {
          try { socket = await pify(connect)(hostify(signal, 'localAddress')) }
          catch (err) {
            const retry = kLucasRetries[signal.retries++]
            if ('number' == typeof retry) {
              return setTimeout(kick, retry)
            } else {
              ban(signal)
            }
          }
        }

        if (socket) {
          swarm.emit('connection', socket, peer)
          socket.pipe(stream(peer)).pipe(socket)
        }
      }

      function hostify(signal, which) {
        return `ws://${signal[which]}:${signal.port}`
      }

      function connect(host, cb) {
        const socket = createCFSWebSocket({host,
          headers: {
            'x-discovery-key': toHex(name),
            'x-peer-id': toHex(id),
          }
        })
        socket.once('error', (err) => cb(err))
        socket.once('close', () => forget(signal))
        socket.once('connect', () => {
          if (host in signals) { socket.close() }
          cb(null, socket)
        })
      }
    })

    return batch.end((err) => {
      if (err) { return (cb || noop)(err) }
    })
  }

  function signalify({
    remoteAddress, localAddress, address,
    remotePort, localPort, port,
    retries, id,
  }) {
    return {
      remoteAddress: remoteAddress || localAddress || address || null,
      localAddress: localAddress || address || null,
      address: address || localAddress || remoteAddress || null,
      port: port || remotePort || localPort || 0,
      retries: retries || 0,
      id: Buffer.isBuffer(id) ? toHex(id) : 'string' == typeof id ? id : null,
    }
  }

  function accept(signal) {
    signal = signalify(signal)
    signals[signal.remoteAddress+':'+signal.port] = signal
    signals[signal.localAddress+':'+signal.port] = signal
    signals[signal.remoteAddress+signal.port] = signal
    signals[signal.localAddress+signal.port] = signal
    signals[signal.id] = signal
    return signal
  }

  function forget(signal) {
    signal = signalify(signal)
    delete signals[signal.remoteAddress+':'+signal.port]
    delete signals[signal.localAddress+':'+signal.port]
    delete signals[signal.remoteAddress+signal.port]
    delete signals[signal.localAddress+signal.port]
    delete signals[signal.id]
    return signal
  }

  function ban(signal) {
    signal = signalify(signal)
    forget(signal)
    banned[signal.remoteAddress+':'+signal.port] = signal
    banned[signal.localAddress+':'+signal.port] = signal
    banned[signal.remoteAddress+signal.port] = signal
    banned[signal.localAddress+signal.port] = signal
    banned[signal.id] = signal
    return signal
  }
}

module.exports = {
  createCFSDiscoverySwarm
}
