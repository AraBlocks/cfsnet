const { BadRequestError } = require('../error')
const messages = require('../messages')
const crypto = require('../../crypto')
const debug = require('debug')('cfsnet:protocol:operations:KeyPair')

/**
 * `KeyPair(string path) -> string`
 * The KeyPair() operation accepts a string file path
 * is an argument and returns a fully resolved path. It
 * resolves file paths based on the path specification
 * @param {Object} opts
 */
module.exports = { KeyPair }
async function KeyPair({
  request, operation, message, cfs
}) {
  const op = messages.KeyPair.decode(message)
  const { seed } = op
  debug('op:', op)
  try {
    const keyPair = crypto.generateKeyPair(seed)
    Object.assign(keyPair, { seed })
    return messages.KeyPair.encode(keyPair)
  } catch (err) {
    throw new BadRequestError(err.message)
  }
}
