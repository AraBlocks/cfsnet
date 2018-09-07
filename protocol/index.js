const { ProtocolError } = require('./error')
const { Duplex } = require('readable-stream')
const operations = require('./operations')
const messages = require('./messages')
const crypto = require('../crypto')
const extend = require('extend')
const debug = require('debug')('cfsnet:protocol')

const CFSNETKEY = Buffer.from('CFSNET1')
const kZeroBuffer = Buffer.alloc(0)

const kDriveKeyLength = 32

const kProtocolOperations = Object.seal(Object.freeze({
  [messages.Operation.AccessFileOperation]: operations.AccessFile,
  [messages.Operation.CloseOperation]: operations.Close,
  [messages.Operation.DownloadDirectoryOperation]: operations.DownloadDirectory,
  [messages.Operation.DownloadFileOperation]: operations.DownloadFile,
  [messages.Operation.KeyPairOperation]: operations.KeyPair,
  [messages.Operation.ListDirectoryOperation]: operations.ListDirectory,
  [messages.Operation.MakeDirectoryOperation]: operations.MakeDirectory,
  [messages.Operation.MakeDirectoryPathOperation]: operations.MakeDirectoryPath,
  [messages.Operation.OpenOperation]: operations.Open,
  [messages.Operation.ReadOperation]: operations.Read,
  [messages.Operation.ReadFileOperation]: operations.ReadFile,
  [messages.Operation.RemoveDirectoryOperation]: operations.RemoveDirectory,
  [messages.Operation.RemoveDirectoryPathOperation]: operations.RemoveDirectoryPath,
  [messages.Operation.ResolveOperation]: operations.Resolve,
  [messages.Operation.StatFileOperation]: operations.StatFile,
  [messages.Operation.TouchFileOperation]: operations.TouchFile,
  [messages.Operation.UnlinkFileOperation]: operations.UnlinkFile,
  [messages.Operation.WriteOperation]: operations.Write,
  [messages.Operation.WriteFileOperation]: operations.WriteFile,
}))

function opname(code) {
  if (null == code) { return opname(messages.Operation.NoOperation) }
  for (const k in messages.Operation) {
    if (code == messages.Operation[k]) { return k }
  }
}

function toHex(value) {
  if (Buffer.isBuffer(value)) {
    return value.toString('hex')
  } else if ('string' === typeof value) {
    return toHex(Buffer.from(value))
  }
  return toHex(String(value))
}

class Protocol extends Duplex {
  constructor({ lookup }) {
    super()
    this.lookup = lookup
    this.isClient = false
    this.needsHandshake = true
  }

  _write(chunk, enc, cb) {
    return this._parse(chunk, cb)
  }

  _read(size) {
    // do nothing
    void size
  }

  _parse(chunk, cb) {
    const { needsHandshake, isClient } = this
    if (needsHandshake) {
      return this.onhandshake(messages.Handshake.decode(chunk), cb)
    } else if (isClient) {
      return this.onresponse(messages.Response.decode(chunk), cb)
    }
    return this.onrequest(messages.Request.decode(chunk), cb)
  }

  nonce() {
    return crypto.nonce()
  }

  key(nonce) {
    return crypto.blake2b(Buffer.concat([ CFSNETKEY, nonce ]))
  }

  reply({ request, buffer, errorCode }) {
    if (null == errorCode) {
      errorCode = message.ErrorCode.NoError
    }

    const { drive, operation } = request
    const nonce = crypto.blake2b(request.nonce)

    request.buffer = kZeroBuffer

    if (drive) {
      drive.secretKey = kZeroBuffer
      if (null == drive.id) { drive.id = kZeroBuffer }
      if (null == drive.key) { drive.key = kZeroBuffer }
    }

    const response = {
      operation,
      errorCode,
      request,
      buffer,
      nonce,
      drive,
    }

    debug(
      'reply: %s: %s: %s',
      opname(operation),
      toHex(nonce),
      errorCode
    )

    this.push(messages.Response.encode(response))
  }

  send({ operation, drive, buffer }, cb) {
    return new Promise((resolve, reject) => {
      if (this.needsHandshake) {
        const err = new Error('Protocol needs handshake.')
        if ('function' === typeof cb) { cb(err) }
        return reject(err)
      }

      // ensure request buffer
      if (null == buffer || false == Buffer.isBuffer(buffer)) {
        buffer = kZeroBuffer
      }

      const nonce = this.nonce()
      const request = {
        operation, drive, buffer, nonce
      }

      this.on('response', onresponse)
      // emit request object with sensitive properties set to the zero buffer
      this.emit('request', extend(true, {}, request, { drive: { secretKey: kZeroBuffer } }))
      this.push(messages.Request.encode(request))

      function onresponse(res) {
        if (!res || !res.request) {
          return
        }

        // verify request nonce
        if (0 != Buffer.compare(res.request.nonce, nonce)) {
          return
        }

        // remove handler since we have the matching request for this response
        this.removeListener('response', onresponse)

        // verify response nonce signature
        if (0 == Buffer.compare(crypto.blake2b(nonce), res.nonce)) {
          if ('function' === typeof cb) { cb(null, res) }
          resolve(res)
        } else {
          reject(new Error('Bad nonce'))
        }
      }
    })
  }

  verify({ nonce, key, ack }) {
    if (false !== ack && false == this.isClient) { return false }
    if (!nonce || 0 == nonce.length) { return false }
    if (!key || 32 != key.length) { return false }
    const expected = crypto.blake2b(Buffer.concat([ CFSNETKEY, nonce ]))
    return 0 == Buffer.compare(expected, key)
  }

  handshake(cb) {
    if (false == this.needsHandshake) { return false }
    const nonce = this.nonce()
    const key = this.key(nonce)
    const ack = false
    return new Promise((resolve, reject) => {
      this.isClient = true
      if ('function' === typeof cb) { this.once('error', cb) }
      this.once('error', reject)
      this.once('handshake', resolve)
      this.once('handshake', (handshake) => {
        this.removeListener('error', reject)
        if ('function' === typeof cb) {
          this.removeListener('error', cb)
          cb(null, handshake)
        }
      })

      this.push(messages.Handshake.encode({ nonce, key, ack }))
    })
  }

  close(cb) {
    return new Promise((resolve, reject) => {
      this.end(onend)
      this.destroy()
      this.once('end', () => this.emit('close'))
      this.once('error', reject)
      if ('function' === typeof cb) { this.once('error', cb) }
      function onend() {
        if ('function' === typeof cb) { cb(null) }
        this.once('error', cb)
        this.once('error', reject)
        resolve()
      }
    })
  }

  async onhandshake(handshake, cb) {
    const { nonce, key, ack } = handshake
    debug('onhandshake: %s: %s: ack:', toHex(key), toHex(nonce), ack)
    if (!nonce || 0 == nonce.length) {
      return cb(new ProtocolError(
        ProtocolError.BAD_HANDSHAKE_NONCE,
        'Invalid or missing nonce in handshake'
      ))
    }

    if (!key || 0 == key.length) {
      return cb(new ProtocolError(
        ProtocolError.BAD_HANDSHAKE_KEY,
        'Invalid or missing key in handshake'
      ))
    }

    if (false == this.isClient && ack !== false) {
      return cb(new ProtocolError(
        ProtocolError.BAD_HANDSHAKE_ACK,
        'Invalid or missing ack in handshake'
      ))
    }

    if (false == this.isClient && false === this.verify(handshake)) {
      return cb(new ProtocolError(
        ProtocolError.BAD_HANDSHAKE_VERIFY,
        'Verification failed in handshake'
      ))
    }

    this.needsHandshake = false
    if (this.isClient) {
      this.emit('handshake', handshake)
    } else {
      this.push(messages.Handshake.encode({ nonce, key, ack: true }))
      this.emit('handshake', { nonce, key, ack: true })
    }
    cb(null)
  }

  async onrequest(request, cb) {
    const self = this
    const {
      nonce, operation, drive, buffer
    } = request
    const {
      BAD_REQUEST_NONCE,
      BAD_REQUEST_OPERATION,
      BAD_REQUEST_DRIVE,
      BAD_REQUEST_DRIVE_ID,
      BAD_HANDSHAKE_KEY,
      BAD_REQUEST_DRIVE_KEY_LENGTH,
    } = ProtocolError

    debug('onrequest: %s: %s:', toHex(nonce), opname(operation))

    if (!nonce || 0 == nonce.length) {
      return onerror(BAD_REQUEST_NONCE, 'Invalid or missing nonce in request')
    }

    if ('number' !== typeof operation) {
      return onerror(BAD_REQUEST_OPERATION, 'Invalid operation code')
    }

    if (drive) {
      if (drive.key && kDriveKeyLength != drive.key.length) {
        return onerror(BAD_REQUEST_DRIVE_KEY_LENGTH, 'Invalid key length')
      }

      debug(
        'onrequest: %s: %s: drive:',
        toHex(nonce),
        opname(operation),
        drive.id ? drive.id.toString() : null,
        drive.key ? toHex(drive.key) : null
      )
    }

    if ('number' !== typeof operation) {
      return onerror(
        BAD_REQUEST_OPERATION,
        `Invalid operation code (${typeof operation}`
      )
    }

    if (Number.isNaN(operation)) {
      return onerror(BAD_REQUEST_OPERATION, 'Invalid operation code (NaN)')
    }

    this.emit('request', request)

    if (operation === messages.Operation.NoOperation) {
      return this.reply({
        request,
        buffer: kZeroBuffer,
        errorCode: messages.ErrorCode.NoError,
      })
    } else if (operation > messages.Operation.NoOperation) {
      for (const k in messages.Operation) {
        if (operation == messages.Operation[k]) {
          return this.onoperation(operation, request, buffer, cb)
        }
      }

      // failed to find valid operation
      return onerror(BAD_REQUEST_OPERATION, 'Invalid operation code')
    }

    function onerror(code, message) {
      const buffer = message
      const errorCode = messages.ErrorCode.BadRequestError
      self.reply({ request, buffer, errorCode })
      return cb(new ProtocolError(code, message))
    }
  }

  async onresponse(response) {
    this.emit('response', response)
  }

  async onoperation(operation, request, message, cb) {
    const ops = kProtocolOperations
    const cfs = request.drive ? await this.lookup(request.drive) : null
    const self = this
    const state = {
      request, operation, message, cfs
    }

    let errorCode = messages.ErrorCode.NoError
    let buffer = null

    if (operation in ops) {
      if ('function' === typeof ops[operation]) {
        debug('onoperation: %s', opname(operation))
        try { buffer = await ops[operation](state) } catch (err) { onoperationerror(err) }
      } else {
        errorCode = messages.ErrorCode.NotImplementedError
        buffer = `Not implemented: ${opname(operation)}`
      }
    } else {
      errorCode = messages.ErrorCode.BadRequestError
      buffer = `Unknown operation type: ${opname(operation)}`
    }

    this.emit('operation', operation, request)
    this.reply({ request, buffer, errorCode })

    return cb(null)

    function onoperationerror(err) {
      self.emit('error', err)
      debug('onoperation: error: fatal:', err)
      buffer = err.message
      errorCode = err.code || messages.ErrorCode.InternalError
    }
  }
}

module.exports = {
  Protocol
}
