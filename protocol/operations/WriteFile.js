const debug = require('debug')('cfsnet:protocol:operations:WriteFile')

const { AccessDeniedError, BadRequestError } = require('../error')
const messages = require('../messages')

/**
 * `WriteFile(string path, bytes buffer, [uint32 start], [uint32 end]) -> void`
 * @param {Object} opts
 */
module.exports = { WriteFile }
async function WriteFile({
  request, operation, message, cfs
}) {
  const op = messages.WriteFile.decode(message)
  debug('op:', op)

  if (!op.path || 'string' !== typeof op.path || 0 === op.path.length) {
    throw new BadRequestError('Bad file path.')
  }

  if (!op.buffer) {
    throw new BadRequestError('Missing buffer.')
  }

  if (!cfs.writable) {
    throw new BadRequestError('Not writable.')
  }

  return cfs.writeFile(op.path, op.buffer, op)
}
