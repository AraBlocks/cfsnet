'use strict'

const { InvalidStateHandshakeProtocolError } = require('./protocol')
const { createCFSKeyPath } = require('./create-key-path')
const { Handshake } = require('./protocol')
const { createCFS } = require('./create')
const through = require('through2')
const drives = require('./drives')
const debug = require('debug')('littlstar:cfs:net')
const net = require('net')

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
    server.emit('protocol:connect')
    const {id, key} = await handshake.credentials()
    server.emit('protocol:credentials', {id, key})

    if (id && key) {
      const path = await createCFSKeyPath({id, key})
      const cfs = drives[path] || await createCFS({id, key})
      server.emit('protocol:cfs', cfs)
      const stream = await handshake.push()
      server.emit('protocol:replicate', stream)
      cfs.replicate({stream})
      socket.pipe(stream).pipe(socket)
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
  process.nextTick(tick)
  return socket
  async function tick() {
    try {
      handshake = new Handshake({socket})
      socket.emit('protocol:handshake', handshake)
    } catch (err) {
      socket.emit('error', new Error("Failed to create handshake."))
      return socket.end()
    }

    try {
      cfs = cfs || await createCFS({id, key})
      id = id || cfs.id
      socket.emit('protocol:cfs', {id, cfs})
    } catch (err) {
      socket.emit('error', new Error("Failed to create cfs."))
      return socket.end()
    }

    try {
      await handshake.connect()
      socket.emit('protocol:connect')
    } catch (err) {
      socket.emit('error', new Error("Failed to initiate handshake connection."))
      return socket.end()
    }

    try {
      await handshake.authenticate({id, key})
      socket.emit('protocol:auth')
      const stream = await handshake.pull()
      socket.emit('protocol:replicated', stream)
      cfs.replicate({stream})
      stream.on('error', (err) => socket.emit('error', err))
      socket.pipe(stream).pipe(socket)
    } catch (err) {
      socket.emit('error', new Error("Failed to initiate handshake authenication."))
      return socket.end()
    }
  }
}

module.exports = {
  createServer,
  connect,
}
