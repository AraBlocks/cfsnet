'use strict'

const { normalizeCFSKey } = require('./key')
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

async function destroyCFS({cfs, id, key, path, destroyPath = false, autoClose = true} = {}) {
  key = key ? normalizeCFSKey(key) : cfs ? cfs.key.toString('hex') : null
  id = id ? id : cfs ? cfs.identifier : null
  path = path || createCFSKeyPath({id, key})
  const drive = cfs || drives[path]
  if (drive) {
    debug("Destroying CFS at path '%s' with key",
      path, drive.key ? drive.key.toString('hex') : null)

    try {
      if ((await pify(drive.readdir)('/')).length) {
        await pify(drive.rimraf)('/')
      }
      if (autoClose) {
        await pify(drive.close)()
      }
    } catch (err) { debug("Failed to remove files in drive") }

    if (destroyPath && '/' != path.trim()) {
      await pify(rimraf)(path.trim())
    }

    debug("Purging CFS drive in CFSMAP")
    delete drives[path]
    return true
  }
  return false
}

module.exports = {
  destroyCFS
}
