

const CFSError = require('./cfs-error')

class NotFoundError extends CFSError {
  constructor(message = '') {
    super({
      code: 404,
      name: 'ENOTFOUND',
      message
    })
  }
}

module.exports = {
  NotFoundError
}
