'use strict'

class CFSError extends Error {
  constuctor({code, name, message} = {}) {
    super(message)
    this.code = code
    this.name = name
    this.message = message
    Error.captureStackTrace(this, this.constuctor)
  }

  get code() { 
    return this.code 
  }

  get name() {
    return this.name
  }

  get message() {
    return this.message
  }
}

module.exports = {
  CFSError
}