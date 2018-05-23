'use strict'

const { normalizeCFSKey } = require('./key')
const hyperdrive = require('hyperdrive')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const rmdir = require('rmdir')
const debug = require('debug')('cfsnet:create:drive')

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

  let drive = null

  drive = hyperdrive(createStorage(), key ? key : undefined, {
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
    (drive.key || Buffer.from(0)).toString('hex'))

  return wrap(drive)

  function createStorage() {
    if ('function' == typeof storage) {
      return (filename) => storage(filename, drive, path)
    } else {
      return storage || path
    }
  }
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

    'ready',
    'access',
    'history',
    'checkout',
    'download',

    'readFile',
    'writeFile',

    'createDiffStream',
    'createReadStream',
    'createWriteStream',
  ]

  const fs = {}
  const fsdebug = require('debug')('cfsnet:drive:fs')

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
  const { mkdir, rmdir, checkout } = drive
  // extra useful methods
  Object.assign(drive, {
    rmdir(dir, cb) {
      rmdir(dir, (err) => {
        if (err) {
          if (err.message.toLowerCase().match(/directory is not empty/)) {
            return cb(Object.assign(new Error('ENOTEMPTY'), {code: 'ENOTEMPTY'}))
          }
        }
        cb(err)
      })
    },

    mkdir(dir, opts, cb) {
      if ('function' == typeof opts) {
        cb = opts
        opts = {}
      }
      return mkdir(dir, opts, cb)
    },

    // mkdir -p
    mkdirp(dir, cb) {
      return mkdirp(dir, {fs: drive}, cb)
    },

    // rm -rf
    rimraf(dir, cb) {
      return rimraf(dir, drive, cb)
    },

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
