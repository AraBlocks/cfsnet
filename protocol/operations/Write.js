

const { NotImplementedError } = require('../error')
const messages = require('../messages')
const debug = require('debug')('cfsnet:protocol:operations:Write')

/**
 * `Write(string path, bytes buffer, [uint32 start], [uint32 end]) -> bytes`
 * @param {Object} opts
 */
module.exports = { Write }
async function Write({
  request, operation, message, cfs
}) {
  throw new NotImplementedError()
}
