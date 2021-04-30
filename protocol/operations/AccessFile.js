const debug = require('debug')('cfsnet:protocol:operations:AccessFile')

const {
  NotSupportedError,
  AccessDeniedError,
  BadRequestError,
  NotFoundError
} = require('../error')

const messages = require('../messages')

/**
 * `AccessFile(string path, [uint32 mode]) -> string`
 * @param {Object} opts
 */
module.exports = { AccessFile }
async function AccessFile({
  request, operation, message, cfs
}) {
  const op = messages.AccessFile.decode(message)
  debug('op:', op)

  if (null == op.path || 0 === op.path.length) {
    throw new BadRequestError('Missing path.')
  }

  try {
    const value = await cfs.access(op.path, op.mode)
    return messages.Boolean.encode({ value })
  } catch (err) {
    if (/accessdenied/i.test(err.message)) {
      throw new AccessDeniedError()
    }

    if (/notsupported/i.test(err.message)) {
      throw new NotSupportedError()
    }

    throw new NotFoundError()
  }
}
