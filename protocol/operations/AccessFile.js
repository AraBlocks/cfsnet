'use strict'

const messages = require('../messages')
const debug = require('debug')('cfsnet:protocol:operations:AccessFile')

const {
  NotSupportedError,
  NotFoundError,
  AccessDeniedError,
  BadRequestError,
} = require('../error')

/**
 * `AccessFile(string path, [uint32 mode]) -> string`
 * @param {Object} opts
 */
module.exports = { AccessFile }
async function AccessFile({request, operation, message, cfs}) {
  const op = messages.AccessFile.decode(message)
  debug("op:", op)
  if (null == op.path || 0 == op.path.length) {
    throw new BadRequestError("Missing path.")
  }

  try { return await cfs.access(op.path, op.mode) }
  catch (err) {
    if (/accessdenied/i.test(err.message)) {
      throw new AccessDeniedError()
    }

    if (/notsupported/i.test(err.message)) {
      throw NotSupportedError()
    }

    throw new NotFoundError()
  }
}
