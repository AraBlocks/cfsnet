const { dirname } = require('path')
const debug = require('debug')('cfsnet:protocol:operations:MakeDirectory')

const { BadRequestError } = require('../error')
const messages = require('../messages')

/**
 * `MakeDirectory(string path) -> string`
 * @param {Object} opts
 */
module.exports = { MakeDirectory }
async function MakeDirectory({
  request, operation, message, cfs
}) {
  const op = messages.MakeDirectory.decode(message)
  debug('op:', op)

  let exists = false

  if (!op.path || 'string' !== typeof op.path || 0 === op.path.length) {
    throw new BadRequestError('Bad file path.')
  }

  try {
    await cfs.access(op.path)
    exists = true
  } catch (err) {
    void err
  }

  if (exists) {
    throw new BadRequestError('Path already exists.')
  }

  try {
    await cfs.access(dirname(op.path))
  } catch (err) {
    throw new BadRequestError('Parent directory does not exist.')
  }

  return cfs.mkdir(op.path)
}
