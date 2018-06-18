const CFSError = require('./cfs-error')

class AccessDeniedError extends CFSError {
  constructor(message = '') {
    super({
      code: 400,
      name: 'EACCESSDENIED',
      message
    })
  }
}

module.exports = {
  AccessDeniedError
}
