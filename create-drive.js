'use strict'

const { normalizeCFSKey } = require('./key')
const hyperdrive = require('hyperdrive')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const debug = require('debug')('littlstar:cfs:create:drive')

async function createCFSDrive({path, key, sparse = true} = {}) {
  key = normalizeCFSKey(key)
  const drive = hyperdrive(path, key ? key : undefined, {
    sparse: sparse ? true : false,
    sparseMetadata: sparse ? true : false,
  })
  drive.setMaxListeners(Infinity)
  // wait for drive to be ready
  await new Promise((resolve, reject) => {
    drive.ready(resolve)
    drive.once('error', reject)
  })
  debug("Initializing CFS HyperDrive instance at '%s' with key '%s'",
    path,
    (drive.key || Buffer(0)).toString('hex'))

  const methods = [
    'stat',
    'lstat',
    'rmdir',
    'mkdir',
    'close',
    'unlink',
    'access',
    'readdir',
    'readFile',
    'writeFile',
  ]

  const fs = {}
  const fsdebug = require('debug')('littlstar:cfs:drive:fs')
  Object.assign(drive, methods.reduce((d, m) => {
    fs[m] = drive[m].bind(drive)
    return Object.assign(d, {[m]: (...args) => {
      if ('function' != typeof args[0]) {
        fsdebug("call %s", m, String(args[0]))
      }
      return fs[m](...args)
    }})
  }, {}))

  // monkey patch to throw correct fs error
  const {rmdir} = drive
  drive.rmdir = (dir, cb) => {
    rmdir(dir, (err) => {
      if (err) {
        if (err.message.toLowerCase().match(/directory is not empty/)) {
          return cb(Object.assign(new Error('ENOTEMPTY'), {code: 'ENOTEMPTY'}))
        }
      }
      cb(err)
    })
  }

  // extra useful methods
  Object.assign(drive, {
    mkdirp(dir, cb) { return mkdirp(dir, {fs: drive}, cb) },
    rimraf(dir, cb) { return rimraf(dir, drive, cb) },
    touch(path, cb) {
      drive.access(path, (err) => {
        // does not exist
        if (err) { drive.writeFile(path, Buffer.from(''), cb) }
        else { cb(null) }
      })
    },
  })

  return drive
}

module.exports = {
  createCFSDrive
}
