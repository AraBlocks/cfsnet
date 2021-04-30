class CFSError extends Error {
  constructor({ code, name, message } = {}) {
    super(message)

    this.code = code
    this.name = name
    this.message = message
    Error.captureStackTrace(this, this.constuctor)
  }
}

module.exports = {
  CFSError
}
