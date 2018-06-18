const { resolve, join } = require('path')
const debug = require('debug')('cfsnet:env')

/**
 * The root CFS directory path on the machine's filesystem.
 */
const CFS_ROOT_DIR = process.env.CFS_ROOT_DIR || resolve('.cfs')

debug(`
  CFS_ROOT_DIR: ${CFS_ROOT_DIR}
`)

module.exports = {
  CFS_ROOT_DIR,
}
