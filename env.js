const { resolve } = require('path')
const debug = require('debug')('cfsnet:env')

/**
 * The root CFS directory path on the machine's filesystem.
 */

module.exports = {
  get CFS_ROOT_DIR() {
    return process.env.CFS_ROOT_DIR || resolve('.cfs')
  },

  set CFS_ROOT_DIR(dir) {
    debug('CFS_ROOT_DIR=%s', dir)
    process.env.CFS_ROOT_DIR = resolve(dir)
  }
}
