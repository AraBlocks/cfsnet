const Connections = require('connections')
const randombytes = require('randombytes')
const discovery = require('discovery-swarm')
const isBrowser = require('is-browser')
const toBuffer = require('to-buffer')
const debug = require('debug')('cfsnet:swarm')
const lucas = require('lucas-series')
const Batch = require('batch')
const ipify = require('ipify')
const turbo = require('turbo-net')
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
const kLucasRetries = [ ...lucas(0, 4) ].map(i => i * 1000)

function noop() {}
function toHex(v) {
  return Buffer.isBuffer(v)
    ? v.toString('hex')
    : toHex(Buffer.from(v, 'hex'))
}

function bootstrapify(host) {
  if ('string' === typeof host) {
    const parts = host.split(':')
    return { host: parts[0], port: parts[1] || 6881 }
  }
  return host
}

async function createCFSDiscoverySwarm({
  maxConnections = 0,
  stream = noop,
  port = kCFSDiscoverySwarmPort,
  dns = {},
  dht = {},
  tcp = true,
  utp = true,
  ws = { port: kCFSDiscoverySwarmWebSocketPort }
}) {
  const id = randombytes(32)
  const hubs = {}
  const banned = {}
  const signals = {}
  const swarm = discovery({
    maxConnections,
    stream,
    id,
    hash: false,
    tcp: isBrowser ? false : tcp,
    utp: isBrowser ? false : utp,
    dns: isBrowser ? false : {
      ttl: dns.ttl || 30,
      limit: dns.limit || 1000,
      loopback: null != dns.loopback ? dns.loopback : false,
      multicast: null != dns.multicast ? dns.multicast : true,
      domain: dns.domain || 'cfs.local',
      server: dns.server || [ '127.0.0.1' ],
    },

    dht: isBrowser ? false : {
      maxPeers: dht.maxPeers || 10000,
      maxTables: dht.maxTables || 10000,
      bootstrap: [ { host: '127.0.0.1', port: 6881 } ]
        .concat(Array.isArray(dht.bootstrap)
          ? dht.bootstrap.map(bootstrapify)
          : dht.bootstrap)
        .filter(Boolean)
    }
  })

  swarm.setMaxListeners(Infinity)

  if (false == isBrowser && (tcp || utp)) {
    await new Promise((resolve) => {
      swarm.once('error', onlisten)
      try { swarm.listen(port || 0, onlisten) } catch (err) { onlisten(err) }
      function onlisten(err) {
        swarm.removeListener('error', onlisten)
        if (err) { swarm.listen(0, resolve) } else { resolve() }
      }
    })
  }

  let wss = null
  if (false !== ws) {
    try {
      void await (async function init(port) {
        debug('ws: init: port=%s', port)
        const server = turbo.createServer()
        server.listen(port, (err) => {
          server.on('error', (err) => { swarm.emit('error', err) })
        })
        wss = await createCFSWebSocketServer({ server })
        wss.connections = Connections(wss)
        wss.on('error', (err) => {
          if (err && 'EADDRINUSE' == err.code) { init(0) }
        })
      }((ws || {}).port || 0))
    } catch (err) { }

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

      const wStream = createCFSWebSocketStream({ socket })
      const signal = accept({ id, address, port })
      const channel = Buffer.from(discoveryKey, 'hex')
      const peer = {
        type: 'ws',
        initiator: false,
        id: `${signal.remoteAddress}@${toHex(channel)}`,
        host: signal.remoteAddress,
        port: signal.port,
        channel,
        retries: signal.retries,
      }

      swarm.emit('connection', wStream, peer)
      wStream.pipe(stream(peer)).pipe(wStream)
    })
  }

  const _join = swarm.join.bind(swarm)
  const _leave = swarm.leave.bind(swarm)

  return Object.assign(swarm, {
    join, leave
  })

  function join(name, opts, cb) {
    const batch = new Batch()
    if ('function' === typeof opts) {
      cb = opts
      opts = {}
    }

    opts = opts || {}

    if ('string' === typeof name) {
      name = toBuffer(name)
    }

    if (false == isBrowser && (tcp || utp) && (dht || dns)) {
      batch.push((done) => {
        _join(name, opts, done)
      })
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
        const peer = signalify({
          id, port, address, remoteAddress, localAddress
        })
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
        try { socket = await pify(connect)(signal.localAddress, signal.port) } catch (err) {
          try { socket = await pify(connect)(signal.remoteAddress, signal.port) } catch (err) {
            const retry = kLucasRetries[signal.retries++]
            if ('number' === typeof retry) {
              return setTimeout(kick, retry)
            }
            ban(signal)
          }
        }

        if (socket) {
          swarm.emit('connection', socket, peer)
          socket.pipe(stream(peer)).pipe(socket)
        }
      }

      function connect(host, port, cb) {
        host = `ws://${host}:${port}`
        const socket = createCFSWebSocket({
          host,
          headers: {
            'x-discovery-key': toHex(name),
            'x-peer-id': toHex(id),
          }
        })
        socket.once('error', err => cb(err))
        socket.once('close', () => forget(signal))
        socket.once('connect', () => {
          if (host in signals) { socket.close() }
          cb(null, socket)
        })
      }
    })

    return batch.end((err) => {
      if (err) {
        swarm.emit('error', err)
        return (cb || noop)(err)
      }
      debug('join: %s', toHex(name), opts)
      swarm.emit('join', name)
    })
  }

  function leave(name) {
    debug('leave: %s', toHex(name))
    swarm.emit('leave', name)
    return _leave(name)
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
      id: Buffer.isBuffer(id) ? toHex(id) : 'string' === typeof id ? id : null,
    }
  }

  function accept(signal) {
    signal = signalify(signal)
    signals[`${signal.remoteAddress}:${signal.port}`] = signal
    signals[`${signal.localAddress}:${signal.port}`] = signal
    signals[signal.remoteAddress + signal.port] = signal
    signals[signal.localAddress + signal.port] = signal
    signals[signal.id] = signal
    return signal
  }

  function forget(signal) {
    signal = signalify(signal)
    delete signals[`${signal.remoteAddress}:${signal.port}`]
    delete signals[`${signal.localAddress}:${signal.port}`]
    delete signals[signal.remoteAddress + signal.port]
    delete signals[signal.localAddress + signal.port]
    delete signals[signal.id]
    return signal
  }

  function ban(signal) {
    clearTimeout(signal.timeout)
    signal = signalify(signal)
    forget(signal)
    banned[`${signal.remoteAddress}:${signal.port}`] = signal
    banned[`${signal.localAddress}:${signal.port}`] = signal
    banned[signal.remoteAddress + signal.port] = signal
    banned[signal.localAddress + signal.port] = signal
    banned[signal.id] = signal
    signal.timeout = setTimeout(() => {
      delete banned[`${signal.remoteAddress}:${signal.port}`]
      delete banned[`${signal.localAddress}:${signal.port}`]
      delete banned[signal.remoteAddress + signal.port]
      delete banned[signal.localAddress + signal.port]
      delete banned[signal.id]
    }, 10000)
    return signal
  }
}

module.exports = {
  createCFSDiscoverySwarm
}
