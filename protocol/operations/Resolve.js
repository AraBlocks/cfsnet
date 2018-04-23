'use strict'

const { BadRequestError } = require('../error')
const messages = require('../messages')
const debug = require('debug')('cfsnet:protocol:operations:Resolve')

/**
 * `Resolve(string path) -> string`
 * The Resolve() operation accepts a string file path
 * is an argument and returns a fully resolved path. It
 * resolves file paths based on the path specification
 * @param {Object} opts
 */
module.exports = { Resolve }
async function Resolve({request, operation, message, cfs}) {
  const op = messages.Resolve.decode(message)
  debug("op:", op)
  if (!op.path || 'string' != typeof op.path || 0 == op.path.length) {
    throw new BadRequestError("Bad file path.")
  }
  const path = await cfs.resolve(op.path)
  return messages.String.encode({value: path})
}
