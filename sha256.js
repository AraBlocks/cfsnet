'use strict'

const { sha256 } = require('hash.js')

function createSHA256(source, encoding) {
  return sha256().update(source).digest(encoding || 'hex')
}

module.exports = {
  createSHA256
}
