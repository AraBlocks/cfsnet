'use strict'

const CFSError = require('./cfs-error')

class NotOpenedError extends CFSError {
  constructor(message = '') {
    super({
      code: 410,
      name: 'ENOTOPENED',
      message
    })
  }
}

module.exports = {
  NotOpenedError
}