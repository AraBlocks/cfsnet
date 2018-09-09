const { BadRequestError, NotFoundError } = require('../error')
const messages = require('../messages')
const debug = require('debug')('cfsnet:protocol:operations:RemoveDirectory')

/**
 * `RemoveDirectory(string path) -> string`
 * @param {Object} opts
 */
module.exports = { RemoveDirectory }
async function RemoveDirectory({
  request, operation, message, cfs
}) {
  const op = messages.RemoveDirectory.decode(message)
  debug('op:', op)

  if (!op.path || 'string' !== typeof op.path || 0 === op.path.length) {
    throw new BadRequestError('Bad file path.')
  }

  try {
    await cfs.access(op.path)
  } catch (err) {
    throw new NotFoundError()
  }

  try {
    return await cfs.rmdir(op.path)
  } catch (err) {
    const msg = 'ENOTEMPTY' === err.message
      ? 'Directory is not empty'
      : err.message

    throw new BadRequestError(msg)
  }
}
