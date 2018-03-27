'use strict'

const { normalizeCFSKey } = require('./key')
const hyperdrive = require('hyperdrive')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const debug = require('debug')('littlstar:cfs:create:drive')

async function createCFSDrive({
  key = null,
  path = null,
  sparse = true,
  latest = true,
  storage = null,
  revision = null,
  secretKey = null,
  sparseMetadata = false
} = {}) {
  key = normalizeCFSKey(key)

  const drive = hyperdrive(storage || path, key ? key : undefined, {
    secretKey,
    sparse: sparse ? true : false,
    latest: latest ? true : false,
    version: revision,
    sparseMetadata: sparseMetadata ? true : false,
  })

  // wait for drive to be ready
  await new Promise((resolve, reject) => {
    drive.ready(resolve)
    drive.once('error', reject)
  })

  debug("Initializing CFS HyperDrive instance at '%s' with key '%s'",
    storage ? '<random access>' : path,
    (drive.key || Buffer(0)).toString('hex'))

  return wrap(drive)
}

function wrap(drive) {
  drive.setMaxListeners(Infinity)
  const methods = [

    'read',
    'open',
    'close',
    'unlink',

    'stat',
    'lstat',

    'rmdir',
    'mkdir',
    'readdir',

    'access',
    'checkout',
    'download',

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
  const { rmdir, checkout } = drive
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
        if (err) { drive.writeFile(path, Buffer.from('\0'), cb) }
        else { cb(null) }
      })
    },

    checkout(version) {
      return Object.assign(wrap(checkout(version)), {
        hasEventStream: this.hasEventStream,
        flushEvents: this.flushEvents,
        identifier: this.identifier,
        HOME: this.HOME,
      })
    }
  })

  return drive
}

module.exports = {
  createCFSDrive
}
