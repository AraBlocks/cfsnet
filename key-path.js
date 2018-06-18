const { normalizeCFSKey } = require('./key')
const { resolve, join } = require('path')
const { CFS_ROOT_DIR } = require('./env')
const crypto = require('./crypto')

/**
 * This function creates a CFS key path from a given identifier
 * value that is converted into a string. The path is then resolved
 * against the `CFS_ROOT_DIR` environment variable.
 */

function createCFSKeyPath({ id } = {}) {
  const hash = crypto.sha256(id).toString('hex')
  const path = resolve(CFS_ROOT_DIR, hash)
  return path
}

module.exports = {
  createCFSKeyPath
}
