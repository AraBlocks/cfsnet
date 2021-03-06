const debug = require('debug')('cfsnet:protocol:operations:Write')

const { NotImplementedError } = require('../error')
const messages = require('../messages')

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
