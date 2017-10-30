'use strict'

const { createCFSKeyPath } = require('./create-key-path')
const { EventEmitter } = require('events')
const protocol = require('hypercore-protocol')
const debug = require('debug')('littlstar:cfs:protocol')
const pify = require('pify')
const amp = require('amp')

const HANDSHAKE_READ_TIMEOUT = 1000

/**
 * This class represents a handshake between a client and server
 * connection socket. A handshake is comprised of the following sequences
 * before providing or denying CFS replication stream:

 *
 * ## Client initiates TCP connection to host on port 6889 using
 * ## 3-way TCP[SYN->SYN-ACK->ACK] or TLS handshake with an initial
 * ## `INTERMEDIATE` state set on the client.
 * ## If client fails to connect to server, then the client enters into
 * ## a `CONNECT_ERROR` state.
 * alice(client) <-               <TCP Connection >               -> bob(server)
 *
 *
 *
 *
 * ## Client sends `CONNECT` state to server
 * alice(client) -> CONNECT ->                                       bob(server)
 *
 *
 *
 *
 * ## Server acknowledges connection sending `CONNET-ACK`
 * ## state back to client
 * alice(client)                                   <- CONNECT-ACK <- bob(server)
 *
 *
 *
 *
 * ## Client sends `AUTH` state with "client ID", "client key" (CFS public key)
 * ## and optional metadata encodeded as a "AMP" message buffer.
 * alice(client) -> AUTH<id,key,...metadata> ->                      bob(server)
 *
 *
 *
 *
 * ## Server sends authentication deny state if authentication fails
 * ## closing the client-server socket connection
 * ## The server will deny a client if "client id" or "client key" is incorrect
 * ## in type or length. The server will also denby a client in the event of a
 * ## "AMP" message buffer decode error
 * alice(client)                                     <- AUTH-DENY <- bob(server)
 *
 *    or
 *
 * ## Server sends authentication accept state if authentication
 * ## is successful. Any subsequent reads from the client will be a binary
 * ## stream of a CFS drive replication requested by the client
 * alice(client)                                   <- AUTH-ACCEPT <- bob(server)
 *
 *
 *
 *
 * alice(client) -> STREAM_PROBE ->                                  bob(server)
 *
 *
 *
 *
 * alice(client)                                    <- STREAM_ACK <- bob(server)
 *
 *
 *
 * alice(client) -> STREAM_PULL ->                                   bob(server)
 *
 *
 *
 */
class HandshakeProtocol extends EventEmitter {
  static encode(...buffers) { return amp.encode(buffers) }
  static decode(buffer) { return amp.decode(buffer) }

  static encodeState(state) { return Buffer.from(leftPadBytes(state)) }
  static decodeState(buffer) { return hexToInt(String(buffer)) }

  static createHypercoreProtocolStream(opts) {
    const stream = protocol(opts)
    stream.setMaxListeners(Infinity)
    stream.once('close', stream.destroy)
    return stream
  }

  static getProtocolStateString(state) {
    if ('number' == typeof state) {
      for (const k in HandshakeProtocol) {
        if (
          'number' == typeof HandshakeProtocol[k] &&
          state === HandshakeProtocol[k]
        ) {
          return k
        }
      }
    }
    return HandshakeProtocol.getProtocolStateString(HandshakeProtocol.UNKNOWN)
  }

  static getExpectedState(state) {
    // CONNECT*
    switch (state) {
      case HandshakeProtocol.CONNECT:
        return {
          prev: [HandshakeProtocol.INTERMEDIATE],
          next: [HandshakeProtocol.CONNECT_ACK,
                 HandshakeProtocol.CLOSE,
                 HandshakeProtocol.ECONNECT]
        }

      case HandshakeProtocol.CONNECT_ACK:
        return {
          prev: [HandshakeProtocol.CONNECT],
          next: [HandshakeProtocol.AUTH,
                 HandshakeProtocol.CLOSE,
                 HandshakeProtocol.ECONNECT]
        }
    }

    // AUTH*
    switch (state) {
      case HandshakeProtocol.AUTH:
        return {
          prev: [HandshakeProtocol.CONNECT_ACK],
          next: [HandshakeProtocol.AUTH_ACCEPT,
                 HandshakeProtocol.AUTH_DENY,
                 HandshakeProtocol.CLOSE,
                 HandshakeProtocol.EAUTH]
        }

      case HandshakeProtocol.AUTH_DENY:
        return {
          prev: [HandshakeProtocol.AUTH],
          next: [HandshakeProtocol.EAUTH,
                 HandshakeProtocol.CLOSE]
        }

      case HandshakeProtocol.AUTH_ACCEPT:
        return {
          prev: [HandshakeProtocol.AUTH],
          next: [HandshakeProtocol.EAUTH,
                 HandshakeProtocol.CLOSE,
                 HandshakeProtocol.STREAM_PROBE]
        }
    }

    // CLOSE*
    switch (state) {
      case HandshakeProtocol.CLOSE:
        return {
          prev: [HandshakeProtocol.UNKNOWN],
          next: [
            HandshakeProtocol.NULL,
            HandshakeProtocol.INTERMEDIATE,
          ]
        }
    }

    // E*
    switch (state) {
      case HandshakeProtocol.EINTERNAL:
      case HandshakeProtocol.EUNKNOWN:
      case HandshakeProtocol.ECONNECT:
      case HandshakeProtocol.ESTREAM:
      case HandshakeProtocol.EAUTH:
        return {
          prev: [HandshakeProtocol.UNKNOWN],
          next: [HandshakeProtocol.NULL]
        }
    }

    // STREAM*
    switch (state) {
      case HandshakeProtocol.STREAM_PROBE:
        return {
          prev: [HandshakeProtocol.AUTH_ACCEPT],
          next: [HandshakeProtocol.STREAM_ACK,
                 HandshakeProtocol.CLOSE]
        }

      case HandshakeProtocol.STREAM_ACK:
        return {
          prev: [HandshakeProtocol.STREAM_PROBE],
          next: [HandshakeProtocol.STREAM_PULL,
                 HandshakeProtocol.CLOSE]
        }

      case HandshakeProtocol.STREAM_PULL:
        return {
          prev: [HandshakeProtocol.STREAM_ACK],
          next: [HandshakeProtocol.STREAM_ACQ,
                 HandshakeProtocol.CLOSE]
        }

      case HandshakeProtocol.STREAM_ACQ:
        return {
          prev: [HandshakeProtocol.STREAM_PULL],
          next: [HandshakeProtocol.CLOSE]
        }

      case HandshakeProtocol.STREAM_NEW:
        return {
          prev: [HandshakeProtocol.AUTH_ACCEPT],
          next: [HandshakeProtocol.CLOSE]
        }

      case HandshakeProtocol.STREAM_DEL:
        return {
          prev: [HandshakeProtocol.AUTH_ACCEPT],
          next: [HandshakeProtocol.CLOSE]
        }
    }

    // *
    switch(state) {
      case HandshakeProtocol.NULL:
      case HandshakeProtocol.UNKNOWN:
      case HandshakeProtocol.INTERMEDIATE:
      default:
        return {
          prev: [HandshakeProtocol.UNKNOWN],
          next: [HandshakeProtocol.UNKNOWN]
        }
    }
  }

  constructor({socket, drives} = {}) {
    super()
    this.setMaxListeners(Infinity)

    this.state = HandshakeProtocol.NULL
    this.drives = drives
    this.buffer = []
    this.version = 1

    this.history = [
      new HandshakeProtocolHistoryState({
        previous: HandshakeProtocol.UNKNOWN,
        current: this.state,
        version: this.version
      })]

    process.nextTick(() => this.init(socket))
  }

  onerror(err) { this.emit('error', err) }
  onclose() { this.emit('close') }
  onend() { this.emit('end') }

  ondata(data) {
    if (this.state != HandshakeProtocol.STREAM_ACQ) {
      this.buffer.push(HandshakeProtocol.decode(data))
      this.emit('data', data)
    }
  }

  async init(socket) {
    this.socket = socket
    if (socket) {
      this.state = HandshakeProtocol.INTERMEDIATE
      socket.once('close', () => this.onclose())
      socket.once('end', () => this.onend())
      socket.on('data', (data) => this.ondata(data))
      socket.on('error', (err) => this.onerror(err))
      this.emit('ready')
    } else {
      this.state = HandshakeProtocol.NULL
    }
  }

  async ready() {
    return new Promise((resolve) => {
      if (this.socket) { setImmediate(resolve) }
      else { this.once('ready', resolve) }
    })
  }

  async readable() {
    await this.ready()
    const {socket} = this
    const {buffer} = this
    return new Promise((resolve) => {
      let timeout = setTimeout(function tick() {
        clearTimeout(timeout)
        if (buffer.length) { resolve() }
        else { timeout = setTimeout(tick) }
      })
      socket.once('data', () => clearTimeout(timeout))
      socket.once('data', () => resolve())
    })
  }

  async write(...buffers) {
    await this.ready()
    const {socket} = this
    return pify(socket.write.bind(socket))(HandshakeProtocol.encode(...buffers))
  }

  async read() {
    await this.ready()
    await this.readable()
    return this.buffer.shift()
  }

  async send(state, ...buffers) {
    await this.ready()
    await this.setState(state)
    debug("send %s", HandshakeProtocol.getProtocolStateString(state))
    await this.write(HandshakeProtocol.encodeState(state), ...buffers)
    return state
  }

  async receive(state) {
    await this.ready()
    await this.setState(state)
    debug("receive %s", HandshakeProtocol.getProtocolStateString(state))
    const chunks = await this.read()
    if (chunks && chunks.length) {
      const nextState = HandshakeProtocol.decodeState(chunks[0])
      assertState(state, nextState)
    }
    return chunks
  }

  async revert() {
    return await this.revertState()
  }

  async setState(state) {
    await this.ready()
    debug("set state %s", HandshakeProtocol.getProtocolStateString(state))
    const currentState = this.state
    const expectedNextState = HandshakeProtocol.getExpectedState(state)
    const expectedCurrentState = HandshakeProtocol.getExpectedState(currentState)

    const isExpectedNextStateUnknown = (
         1 == expectedNextState.prev.length
      && 1 == expectedNextState.next.lengt
      && HandshakeProtocol.UNKNOWN == expectedNextState.prev[0]
      && HandshakeProtocol.UNKNOWN == expectedNextState.next[0]
    )

    const isExpectedCurrentStateUnknown = (
         1 == expectedCurrentState.prev.length
      && 1 == expectedCurrentState.next.length
      && HandshakeProtocol.UNKNOWN == expectedCurrentState.prev[0]
      && HandshakeProtocol.UNKNOWN == expectedCurrentState.next[0]
    )

    if (false == isExpectedCurrentStateUnknown) {
      if (false == isExpectedNextStateUnknown) {
        assertState(currentState, ...expectedNextState.prev)
        assertState(state, ...expectedCurrentState.next)
      }
    }
    this.history[this.version++] = new HandshakeProtocolHistoryState({
      previous: this.state,
      current: state,
      version: this.version,
    })
    return (this.state = state)
  }

  async revertState(version) {
    if (null == version) { version = this.version - 1 }
    const state = this.history[version - 1]
    debug("Reverting state#%d from %s to %s",
      version, HandshakeProtocol.getProtocolStateString(this.state),
      HandshakeProtocol.getProtocolStateString(state.current))
    this.state = state.previous
    this.version = version
    return await this.setState(state.current)
  }
}

class HandshakeProtocolHistoryState {
  constructor({version, current, previous}) {
    Object.assign(this, {version, current, previous})
    Object.seal(this)
  }
}

class Handshake extends HandshakeProtocol {
  async connect() {
    await this.ready()
    await this.send(HandshakeProtocol.CONNECT)
    await this.receive(HandshakeProtocol.CONNECT_ACK)
  }

  async listen() {
    await this.ready()
    await this.receive(HandshakeProtocol.CONNECT)
    await this.send(HandshakeProtocol.CONNECT_ACK)
  }

  async close() {
    await this.ready()
    await this.send(HandshakeProtocol.CLOSE)
    await this.receive(HandshakeProtocol.CLOSE)
    await new Promise((resolve, reject) => {
      this.socket.once('error', reject).once('close', resolve)
    })
  }

  async authenticate({id, key}) {
    if (!id) {
      throw new AuthenticationHandshakeProtocolError("Missing id string.")
    }

    if (id instanceof Buffer) { id = id.toString('hex') }
    if (key && key instanceof Buffer) { key = key.toString('hex') }
    const auth = Buffer.from(JSON.stringify({id, key}))
    await this.ready()
    await this.send(HandshakeProtocol.AUTH, auth)
    try { await this.receive(HandshakeProtocol.AUTH_ACCEPT) }
    catch (err) {
      if (err instanceof InvalidStateHandshakeProtocolError) {
        await this.revert()
        await this.receive(HandshakeProtocol.AUTH_DENY)
        return false
      }
    }
    return true
  }

  async credentials() {
    await this.ready()
    const buffer = await this.receive(HandshakeProtocol.AUTH)
    const {drives} = this
    const auth = buffer[1]
    const pair = JSON.parse(String(auth))
    if (pair.id && pair.key) {
      const path = await createCFSKeyPath({id: pair.id, key: pair.key})
      if (drives[path]) {
        await this.send(Handshake.AUTH_ACCEPT)
        return pair
      }
    }
    await this.send(Handshake.AUTH_DENY)
    return {id: null, key: null}
  }

  async pull(opts) {
    await this.ready()
    await this.send(HandshakeProtocol.STREAM_PROBE)
    await this.receive(HandshakeProtocol.STREAM_ACK)
    await this.send(HandshakeProtocol.STREAM_PULL)
    await this.receive(HandshakeProtocol.STREAM_ACQ)
    const stream = HandshakeProtocol.createHypercoreProtocolStream(opts)
    return stream
  }

  async push(opts) {
    await this.ready()
    await this.receive(HandshakeProtocol.STREAM_PROBE)
    await this.send(HandshakeProtocol.STREAM_ACK)
    await this.receive(HandshakeProtocol.STREAM_PULL)
    await this.send(HandshakeProtocol.STREAM_ACQ)
    const stream = HandshakeProtocol.createHypercoreProtocolStream(opts)
    return stream
  }
}

/**
 * Protocol errors.
 */
class HandshakeProtocolError extends Error {
  constructor(code, message) {
    super(message)
    Error.captureStackTrace(this)
    Object.assign(this, {code})
    Object.defineProperties(this, {
      code: {enumerable: true},
      message: {enumerable: true}
    })
  }
}

class InvalidStateHandshakeProtocolError extends HandshakeProtocolError {
  constructor(state, message) {
    super('InvalidStateHandshakeProtocolError',
          'Handshake protocol has invalid state '+
          `(${HandshakeProtocol.getProtocolStateString(state)}). ${message || ''}`)
    this.state = state
  }
}

class AuthenticationHandshakeProtocolError extends HandshakeProtocolError {
  constructor(message) {
    super('AuthenticationHandshakeProtocolError',
          `Handshake protocol encountered authentication error. ${message || ''}`)
  }
}

/**
 * Protocol states
 */
Object.assign(HandshakeProtocol, HandshakeProtocol.prototype, {
  // Primitive states [0x00...0x0F]
  NULL: 0x00,
  UNKNOWN: 0x01,
  INTERMEDIATE: 0x03,
  CLOSE: 0x04,

  // Connection state [0xA0...0xAF]
  CONNECT: 0xA0,
  CONNECT_ACK: 0xA2,
  CONNECT_ERROR: 0xA3,

  // Authentication states [0xB0...0xBF]
  AUTH: 0xB0,
  AUTH_DENY: 0xB1,
  AUTH_ACCEPT: 0xB2,

  // Stream states [0xC0...0xCF]
  STREAM_PROBE: 0xC0,
  STREAM_ACK: 0xC1,
  STREAM_PULL: 0xC2,
  STREAM_ACQ: 0xC3,
  STREAM_NEW: 0xC4,
  STREAM_DEL: 0xC5,

  // Error states [0xE0...0xEF]
  EINTERNAL: 0xE0,
  EUNKNOWN: 0xE1,
  ECONNECT: 0xE2,
  ESTREAM: 0xE3,
  EAUTH: 0xE4,
})

// Lock Handshake class and its prototype
Object.seal(Handshake)
Object.seal(Handshake.prototype)
Object.seal(HandshakeProtocol)
Object.seal(HandshakeProtocol.prototype)

function assertState(currentState, ...expectedState) {
  if (-1 == expectedState.indexOf(currentState)) {
    throw new InvalidStateHandshakeProtocolError(currentState,
    'Expected current state to be ' +
    `${expectedState.map(HandshakeProtocol.getProtocolStateString)}.`)
  }
}

function leftPad(size, string, char) {
  while (string.length < size) { string = char + string }
  return string
}

function leftPadBytes(bytes) {
  const pad = (bytes) => leftPad(4, bytes.join(''), 0)
  return bytes.toString('16')
    .split('')
    .reduce(segment, [])
    .map(pad)
    .reverse()
    .join('')
  function segment(array, bytes) {
    // update head
    if (!array[0] || array[0].length == 4) {
      array.unshift([])
    }
    array[0].push(bytes)
    return array
  }
}

function hexToInt(string) {
  return Function('return 0x'+string)()
}

module.exports = {
  AuthenticationHandshakeProtocolError,
  InvalidStateHandshakeProtocolError,
  HandshakeProtocolError,

  HandshakeProtocol,
  Handshake,
}
