const debug = require('debug')('cfsnet:protocol:operations:DownloadDirectory')

const { NotFoundError, BadRequestError } = require('../error')
const messages = require('../messages')

/**
 * `DownloadDirectory(string path) -> void`
 * @param {Object} opts
 */
module.exports = { DownloadDirectory }
async function DownloadDirectory({
  request, operation, message, cfs
}) {
  const op = messages.DownloadDirectory.decode(message)
  debug('op:', op)

  if (!op.path || 'string' !== typeof op.path || 0 === op.path.length) {
    throw new BadRequestError('Bad file path.')
  }

  try {
    await cfs.access(op.path)
  } catch (err) {
    throw new NotFoundError()
  }

  const stat = await cfs.stat(op.path)

  if (!stat.isDirectory()) {
    throw new BadRequestError('File path is not a directory.')
  }

  return cfs.download(op.path)
}
