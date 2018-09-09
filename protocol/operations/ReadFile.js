const messages = require('../messages')
const debug = require('debug')('cfsnet:protocol:operations:ReadFile')

const {
  NotFoundError,
  BadRequestError,
} = require('../error')

/**
 * `ReadFile(string path, [uint32 start], [uint32 end]) -> bytes`
 * The ReadFile() operation accepts a string file path
 * is an argument and returns a fully resolved path. It
 * resolves file paths based on the path specification
 * @param {Object} opts
 */
module.exports = { ReadFile }
async function ReadFile({
  request, operation, message, cfs
}) {
  const op = messages.ReadFile.decode(message)
  debug('op:', op)

  if (!op.path || 'string' !== typeof op.path || 0 === op.path.length) {
    throw new BadRequestError('Bad file path.')
  }

  if (0 === op.end) {
    delete op.end
  }

  try {
    await cfs.access(op.path)
  } catch (err) {
    throw new NotFoundError()
  }

  return cfs.readFile(op.path, op)
}
