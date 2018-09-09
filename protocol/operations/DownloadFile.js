const messages = require('../messages')
const debug = require('debug')('cfsnet:protocol:operations:DownloadFile')

const {
  NotFoundError,
  BadRequestError,
} = require('../error')

/**
 * `DownloadFile(string path) -> void`
 * @param {Object} opts
 */
module.exports = { DownloadFile }
async function DownloadFile({
  request, operation, message, cfs
}) {
  const op = messages.DownloadFile.decode(message)
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

  if (!stat.isFile()) {
    throw new BadRequestError('File path is not a file.')
  }

  return cfs.download(op.path)
}
