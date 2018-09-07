const CFSError = require('./cfs-error')

class NotSupportedError extends CFSError {
  constructor(message = '') {
    super({
      code: 405,
      name: 'ENOTSUPPORTED',
      message
    })
  }
}

module.exports = {
  NotSupportedError
}
