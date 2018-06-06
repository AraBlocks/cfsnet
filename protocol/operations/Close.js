'use strict'

const messages = require('../messages')
const debug = require('debug')('cfsnet:protocol:operations:Close')

const {
  AccessDeniedError,
  BadRequestError,
  NotOpenedError,
} = require('../error')

/**
 * `Close(uint32 fd) -> void`
 * @param {Object} opts
 */
module.exports = { Close }
async function Close({request, operation, message, cfs}) {
  const op = messages.Close.decode(message)
  debug("op:", op)

  if (op.fileDescriptor <= 0) {
    throw new BadRequestError("Bad file descriptor.")
  }

  if (false == op.fileDescriptor in cfs.fileDescriptors) {
    throw new NotOpenedError("File descriptor not opened.")
  }

  return await cfs.close(op.fileDescriptor)
}
