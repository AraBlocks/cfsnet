const messages = require('../messages')
const debug = require('debug')('cfsnet:protocol:operations:ListDirectory')

const {
  NotFoundError,
  NotImplementedError,
} = require('../error')

/**
 * `ListDirectory(string path) -> string`
 * @param {Object} opts
 */
module.exports = { ListDirectory }
async function ListDirectory({
  request, operation, message, cfs
}) {
  const op = messages.ListDirectory.decode(message)
  debug('op:', op)

  if (!op.path || 'string' !== typeof op.path || 0 == op.path.length) {
    throw new BadRequestError('Bad file path.')
  }

  try { await cfs.access(op.path) } catch (err) { throw new NotFoundError() }

  const stat = await cfs.stat(op.path)

  if (false == stat.isDirectory()) {
    throw new BadRequestError('File path is not a directory.')
  }

  const entries = await cfs.readdir(op.path)

  return messages.List.encode({ values: entries, length: entries.length })
}
