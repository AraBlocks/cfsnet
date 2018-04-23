'use strict'

const { BadRequestError, NotFoundError } = require('../error')
const messages = require('../messages')
const debug = require('debug')('cfsnet:protocol:operations:UnlinkFile')

/**
 * `UnlinkFile(string path) -> string`
 * @param {Object} opts
 */
module.exports = { UnlinkFile }
async function UnlinkFile({request, operation, message, cfs}) {
  const op = messages.UnlinkFile.decode(message)
  debug("op:", op)

  if (!op.path || 'string' != typeof op.path || 0 == op.path.length) {
    throw new BadRequestError("Bad file path.")
  }

  try { await cfs.access(op.path) }
  catch (err) { throw new NotFoundError() }

  return await cfs.unlink(op.path)
}
