

const messages = require('../messages')
const debug = require('debug')('cfsnet:protocol:operations:Read')

const {
  AccessDeniedError,
  BadRequestError,
  NotOpenedError,
} = require('../error')

/**
 * `Read(uint32 fileDescriptor, [uint32 start], [uint32 end]) -> bytes`
 * @param {Object} opts
 */
module.exports = { Read }
async function Read({
  request, operation, message, cfs
}) {
  const op = messages.Read.decode(message)
  debug('op:', op)
  if (op.fileDescriptor <= 0) {
    throw new BadRequestError('Bad file descriptor.')
  }

  if (false == op.fileDescriptor in cfs.fileDescriptors) {
    throw new NotOpenedError('File descriptor not opened.')
  }

  return await cfs.read(op.fileDescriptor, op)
}
