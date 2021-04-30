const debug = require('debug')('cfsnet:protocol:operations:StatFile')

const { BadRequestError } = require('../error')
const messages = require('../messages')

/**
 * `StatFile(string path) -> Stat`
 * @param {Object} opts
 */
module.exports = { StatFile }
async function StatFile({
  request, operation, message, cfs
}) {
  const op = messages.StatFile.decode(message)
  debug('op:', op)

  if (!op.path || 'string' !== typeof op.path || 0 === op.path.length) {
    throw new BadRequestError('Bad file path.')
  }

  return messages.Stat.encode(await cfs.stat(op.path))
}
