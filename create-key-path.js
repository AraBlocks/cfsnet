'use strict'

const { CFS_ROOT_DIR } = require('./env')
const { createSHA256 } = require('./sha256')
const { resolve, join } = require('path')

/**
 * This function creates a CFS key path from a given identifier
 * value that is converted into a string. The path is then resolved
 * against the `CFS_ROOT_DIR` environment variable.
 */

function createCFSKeyPath({id} = {}) {
  const hash = createSHA256(String(id))
  const path = resolve(CFS_ROOT_DIR, hash)
  return path
}

module.exports = {
  createCFSKeyPath
}
