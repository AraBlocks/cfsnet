/* eslint-disable global-require */
const rimraf = require('rimraf')
const debug = require('debug')('cfsnet:destroy')
const pify = require('pify')

const { createCFSKeyPath } = require('./key-path')
const { normalizeCFSKey } = require('./key')

/**
 * This function will attempt to destroy a CFS based on
 * some input identifier. The CFS key path is derived from the
 * input identifier. The entire drive is removed, closed, purged
 * from disk, and removed from the shared CFS drive map.
 */
async function destroyCFS(opts) {
  const { cfs = null, autoClose = true } = opts
  const id = opts.id || (cfs && cfs.identifier) || null
  const key = (
    (opts.key && normalizeCFSKey(opts.key))
    || (cfs && cfs.key.toString('hex'))
    || null
  )

  const path = opts.path || createCFSKeyPath({ id })
  const drive = cfs

  if (drive) {
    debug(
      'Destroying CFS at path "%s" with key',
      path, drive.key ? drive.key.toString('hex') : null
    )

    if (autoClose) {
      await pify(drive.close)()
    }

    return true
  }

  return false
}

module.exports = {
  destroyCFS
}
