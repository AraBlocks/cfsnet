const { BadRequestError } = require('../error')
const messages = require('../messages')
const debug = require('debug')('cfsnet:protocol:operations:MakeDirectoryPath')

/**
 * `MakeDirectoryPath(string path) -> string`
 * @param {Object} opts
 */
module.exports = { MakeDirectoryPath }
async function MakeDirectoryPath({
  request, operation, message, cfs
}) {
  const op = messages.MakeDirectoryPath.decode(message)
  debug('op:', op)
  if (!op.path || 'string' !== typeof op.path || 0 == op.path.length) {
    throw new BadRequestError('Bad file path.')
  }
  return await cfs.mkdirp(op.path)
}
