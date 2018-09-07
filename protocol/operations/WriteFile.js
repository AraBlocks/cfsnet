const { AccessDeniedError, BadRequestError } = require('../error')
const messages = require('../messages')
const debug = require('debug')('cfsnet:protocol:operations:WriteFile')

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

  if (!op.path || 'string' !== typeof op.path || 0 == op.path.length) {
    throw new BadRequestError('Bad file path.')
  }

  if (null == op.buffer) {
    throw new BadRequestError('Missing buffer.')
  }

  if (false == cfs.writable) {
    throw new BadRequestError('Not writable.')
  }

  return await cfs.writeFile(op.path, op.buffer, op)
}
