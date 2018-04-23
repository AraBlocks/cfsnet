'use strict'

const { ErrorCode } = require('./messages')

class ProtocolError extends Error {
  static get BAD_HANDSHAKE_NONCE() { return 1000 }
  static get BAD_HANDSHAKE_KEY() { return 1100 }
  static get BAD_HANDSHAKE_ACK() { return 1200 }
  static get BAD_HANDSHAKE_VERIFY() { return 1300 }

  static get BAD_REQUEST_NONCE() { return 2000 }
  static get BAD_REQUEST_OPERATION() { return 2100 }

  static get BAD_REQUEST_DRIVE() { return 3000 }
  static get BAD_REQUEST_DRIVE_ID() { return 3100 }
  static get BAD_REQUEST_DRIVE_KEY() { return 3200 }
  static get BAD_REQUEST_DRIVE_KEY_LENGTH() { return 3210 }

  static get UNKNOWN_OPERATION() { return 9999 }

  constructor(code, message) {
    super(message)
    this.code = code
    this.status = code
  }
}

function makeErrorMessage(prefix, message) {
  return `${prefix}:${message || ''}`
}

function message(Constructor) {
  return `${Constructor.name}(${Constructor.code})`
}

function code(Constructor) {
  return ErrorCode[Constructor.name]
}

class ProtocolMessageError extends ProtocolError {
  static get code() { return code(this) }
  static get message() { return message(this) }
}

class AccessDeniedError extends ProtocolMessageError {
  constructor(message) {
    super(AccessDeniedError.code,
      makeErrorMessage(AccessDeniedError.message, message))
  }
}

class BadRequestError extends ProtocolMessageError {
  constructor(message) {
    super(BadRequestError.code,
      makeErrorMessage(BadRequestError.message, message))
  }
}

class InternalError extends ProtocolMessageError {
  constructor(message) {
    super(InternalError.code,
      makeErrorMessage(InternalError.message, message))
  }
}

class NotFoundError extends ProtocolMessageError {
  constructor(message) {
    super(NotFoundError.code,
      makeErrorMessage(NotFoundError.message, message))
  }
}

class NotImplementedError extends ProtocolMessageError {
  constructor(message) {
    super(NotImplementedError.code,
      makeErrorMessage(NotImplementedError.message, message))
  }
}

class NotOpenedError extends ProtocolMessageError {
  constructor(message) {
    super(NotOpenedError.code,
      makeErrorMessage(NotOpenedError.message, message))
  }
}

class NotSupportedError extends ProtocolMessageError {
  constructor(message) {
    super(NotSupportedError.code,
      makeErrorMessage(NotSupportedError.message, message))
  }
}

module.exports = {
  ProtocolMessageError,
  ProtocolError,

  AccessDeniedError,
  BadRequestError,
  InternalError,
  NotFoundError,
  NotImplementedError,
  NotOpenedError,
  NotSupportedError,

  message,
  code,
}
