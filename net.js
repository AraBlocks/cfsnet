'use strict'

const { InvalidStateHandshakeProtocolError } = require('./protocol')
const { createCFSKeyPath } = require('./create-key-path')
const { Handshake } = require('./protocol')
const { createCFS } = require('./create')
const through = require('through2')
const drives = require('./drives')
const debug = require('debug')('littlstar:cfs:net')
const net = require('net')

const {
  PROTOCOL_AUTH,
  PROTOCOL_CFS,
  PROTOCOL_CONNECT,
  PROTOCOL_CREDENTIALS,
  PROTOCOL_HANDSHAKE,
  PROTOCOL_PULL,
  PROTOCOL_PUSH
} = require('./events')

/**
 */
function createServer() {
  let connectionCount = 0
  const server = net.createServer(onsocket)
  return server
  async function onsocket(socket) {
    const { address } = socket.address()
    const handshake = new Handshake({socket, drives})
    void connectionCount++
    debug("New connection Socket#%d(%s)", connectionCount, address)
    socket.once('close', () => { void connectionCount-- })

    await handshake.listen()
    server.emit(PROTOCOL_CONNECT, socket)
    const {id, key} = await handshake.credentials()
    server.emit(PROTOCOL_CREDENTIALS, {id, key})

    if (id && key) {
      await handshake.push()

      const path = await createCFSKeyPath({id, key})
      const cfs = drives[path] || await createCFS({id, key})
      server.emit(PROTOCOL_CFS, cfs)

      const stream = cfs.replicate({download: false, upload: true})

      stream.setMaxListeners(Infinity)
      stream.once('close', stream.destroy)
      stream.on('error', (err) => socket.emit('error', err))

      server.emit(PROTOCOL_PUSH, stream)

      socket.pipe(stream).pipe(socket).on('end', () => {
        debug("Socket did reach EOS")
      })
    }
  }
}

/**
 * This function will connect to a peer and return a proxy stream
 * that has a remote CFS replicated into it
 */
function connect({port, hostname, id, key, cfs}) {
  const socket = net.connect(port, hostname)
  let handshake = null
  socket.once('connect', onconnect)
  return socket
  function onconnect() {
    // we defer exeuction to the next tick to give socket consumers
    // the opportunity to subscribe to protocol events
    process.nextTick(async () => {
      try {
        handshake = new Handshake({socket})
        socket.emit(PROTOCOL_HANDSHAKE, handshake)
      } catch (err) {
        socket.emit('error', new Error("Failed to create handshake."))
        return socket.end()
      }

      try {
        cfs = cfs || await createCFS({id, key})
        id = id || cfs.id
        socket.emit(PROTOCOL_CFS, cfs)
      } catch (err) {
        socket.emit('error', new Error("Failed to create cfs."))
        return socket.end()
      }

      try {
        await handshake.connect()
        socket.emit(PROTOCOL_CONNECT)
      } catch (err) {
        socket.emit('error', new Error("Failed to initiate handshake connection."))
        return socket.end()
      }

      try {
        await handshake.authenticate({id, key})
        socket.emit(PROTOCOL_AUTH)

        const stream = cfs.replicate({download: true, upload: false})

        stream.on('error', (err) => socket.emit('error', err))
        stream.setMaxListeners(Infinity)
        stream.once('close', stream.destroy)

        await handshake.pull()
        socket.emit(PROTOCOL_PULL, stream)

        socket.pipe(stream).pipe(socket)
      } catch (err) {
        socket.emit('error', new Error("Failed to initiate handshake authenication."))
        return socket.end()
      }
    })
  }
}

module.exports = {
  createServer,
  connect,
}
