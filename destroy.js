'use strict'

const { createCFSKeyPath } = require('./create-key-path')
const { CFS_ROOT_DIR } = require('./env')
const { resolve } = require('path')
const drives = require('./drives')
const rimraf = require('rimraf')
const debug = require('debug')('littlstar:cfs:destroy')
const pify = require('pify')

/**
 * This function will attempt to destroy a CFS based on
 * some input identifier. The CFS key path is derived from the
 * input identifier. The entire drive is removed, closed, purged
 * from disk, and removed from the shared CFS drive map.
 */

async function destroyCFS({id, key} = {}) {
  const path = createCFSKeyPath({id, key})
  const drive = drives[path] || createCFSKeyPath({id, key})
  if (drive) {
    debug("Destroying CFS at path '%s' with key",
      path, drive.key.toString('hex'))

    await pify(drive.rimraf)('/')
    await pify(drive.close)()
    await pify(rimraf)(path)
    debug("Purging CFS drive in CFSMAP")
    delete drives[path]
  }
}

module.exports = {
  destroyCFS
}
