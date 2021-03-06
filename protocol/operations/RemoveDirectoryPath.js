const debug = require('debug')('cfsnet:protocol:operations:RemoveDirectoryPath')

const { BadRequestError } = require('../error')
const messages = require('../messages')

/**
 * `RemoveDirectoryPath(string path) -> string`
 * @param {Object} opts
 */
module.exports = { RemoveDirectoryPath }
async function RemoveDirectoryPath({
  request, operation, message, cfs
}) {
  const op = messages.RemoveDirectoryPath.decode(message)
  debug('op:', op)

  if (!op.path || 'string' !== typeof op.path || 0 === op.path.length) {
    throw new BadRequestError('Bad file path.')
  }

  try {
    await cfs.access(op.path)
  } catch (err) {
    return
  }

  return cfs.rimraf(op.path)
}
