/* eslint-disable global-require */
const { createCFSKeyPath } = require('./key-path')
const { normalizeCFSKey } = require('./key')
const drives = require('./drives')
const rimraf = require('rimraf')
const debug = require('debug')('cfsnet:destroy')
const pify = require('pify')

/**
 * This function will attempt to destroy a CFS based on
 * some input identifier. The CFS key path is derived from the
 * input identifier. The entire drive is removed, closed, purged
 * from disk, and removed from the shared CFS drive map.
 */
async function destroyCFS(opts) {
  const {
    fs = require('fs'),
    cfs = null,
    autoClose = true,
    destroyPath = false,
  } = opts

  const id = opts.id || (cfs && cfs.identifier) || null
  const key = (
    (opts.key && normalizeCFSKey(opts.key)) ||
    (cfs && cfs.key.toString('hex')) ||
    null
  )

  const path = opts.path || createCFSKeyPath({ id, key })
  const drive = cfs || drives[path]

  if (drive) {
    debug(
      'Destroying CFS at path "%s" with key',
      path, drive.key ? drive.key.toString('hex') : null
    )

    try {
      try {
        await pify(drive.stat)(drive.HOME)
        await pify(drive.rimraf)(drive.HOME)
      } catch (err) { void err }

      if (autoClose) {
        await pify(drive.close)()
      }
    } catch (err) {
      debug('Failed to remove files in drive', err)
    }

    if (destroyPath && '/' !== path.trim()) {
      await pify(rimraf)(path.trim(), fs)
    }

    debug('Purging CFS drive in CFSMAP')
    delete drives[path]
    return true
  }

  return false
}

module.exports = {
  destroyCFS
}
