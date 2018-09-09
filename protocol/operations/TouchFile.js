const { BadRequestError } = require('../error')
const messages = require('../messages')
const debug = require('debug')('cfsnet:protocol:operations:TouchFile')

/**
 * `TouchFile(string path) -> string`
 * @param {Object} opts
 */
module.exports = { TouchFile }
async function TouchFile({
  request, operation, message, cfs
}) {
  const op = messages.TouchFile.decode(message)
  debug('op:', op)

  if (!op.path || 'string' !== typeof op.path || 0 === op.path.length) {
    throw new BadRequestError('Bad file path.')
  }

  return cfs.touch(op.path)
}
