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
  return net.createServer(onsocket)
  async function onsocket(socket) {
    const { address } = socket.address()
    const handshake = new Handshake({socket, drives})
    void connectionCount++
    debug("New connection Socket#%d(%s)", connectionCount, address)
    socket.once('close', () => { void connectionCount-- })

    await handshake.listen()
    const {id, key} = await handshake.credentials()

    if (id && key) {
      const path = await createCFSKeyPath({id, key})
      const cfs = drives[path] || await createCFS({id, key})
      const stream = await handshake.push()
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
  const handshake = new Handshake({socket})
  process.nextTick(tick)
  return socket
  async function tick() {
    cfs = cfs || await createCFS({id, key})
    id = id || cfs.id
    try {
      await handshake.connect()
      if (await handshake.authenticate({id, key})) {
        const stream = await handshake.pull()
        cfs.replicate({stream})
        socket.pipe(stream).pipe(socket)
      }
    } catch (err) {
      socket.emit('error', err)
    }
  }
}

module.exports = {
  createServer,
  connect,
}
