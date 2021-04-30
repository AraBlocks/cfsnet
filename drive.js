/* eslint-disable global-require */
const { resolve } = require('path')
const hyperdrive = require('hyperdrive')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const debug = require('debug')('cfsnet:create:drive')
const raf = require('random-access-file')
const ram = require('random-access-memory')

const { normalizeCFSKey } = require('./key')

async function createCFSDrive(opts) {
  let drive = null

  const {
    sparseMetadata = false,
    storeSecretKey = true,
    extensions = [],
    secretKey = null,
    revision = null,
    storage = null,
    latest = true,
    sparse = true,
    path = null,
  } = opts

  const key = normalizeCFSKey(opts.key)

  drive = hyperdrive(createStorage(), key || undefined, {
    secretKey,
    sparseMetadata: Boolean(sparseMetadata),
    version: revision,
    latest: Boolean(latest),
    sparse: Boolean(sparse),
    extensions
  })

  // wait for drive to be ready
  await new Promise((resolve, reject) => {
    drive.ready(resolve)
    drive.once('error', reject)
  })

  debug(
    'Initializing CFS HyperDrive instance at "%s" with key "%s"',
    storage ? '<random access>' : path,
    (drive.key || Buffer.from(0)).toString('hex')
  )

  return wrap(drive)

  function createStorage() {
    return (filename) => {
      if (
        false === storeSecretKey
        && filename.includes('secret')
        && filename.includes('key')
      ) {
        return ram()
      }

      if ('function' === typeof storage) {
        return storage(filename, drive, path)
      }

      return raf(resolve(storage || path, filename))
    }
  }
}

function wrap(drive) {
  drive.setMaxListeners(Infinity)
  const methods = [
    'open',
    'close',
    'read',
    'stat',
    'lstat',
    'write',
    'access',
    'unlink',
    'rmdir',
    'mkdir',
    'readdir',
    'readFile',
    'writeFile',

    'create',
    'ready',
    'history',
    'checkout',
    'download',

    'createDiffStream',
    'createReadStream',
    'createWriteStream',
  ]

  const fs = {}
  const fsdebug = require('debug')('cfsnet:drive:fs')

  Object.assign(drive, methods.reduce((proxy, method) => {
    if ('function' !== typeof drive[method]) {
      return proxy
    }

    fs[method] = drive[method].bind(drive)
    return Object.assign(proxy, {
      [method]: (...args) => {
        if ('function' !== typeof args[0]) {
          fsdebug('call %s', method, String(args[0]))
        }

        return fs[method](...args)
      }
    })
  }, {}))

  // monkey patch to throw correct fs error
  const { mkdir, rmdir, checkout } = drive

  // extra useful methods
  Object.assign(drive, {
    rmdir(dir, cb) {
      rmdir(dir, (err) => {
        if (err) {
          if (err.message.toLowerCase().match(/directory is not empty/)) {
            return cb(Object.assign(new Error('ENOTEMPTY'), { code: 'ENOTEMPTY' }))
          }
        }
        cb(err)
      })
    },

    mkdir(dir, opts, cb) {
      if ('function' === typeof opts) {
        cb = opts
        opts = {}
      }
      return mkdir(dir, opts, cb)
    },

    // mkdir -p
    mkdirp(dir, opts, cb) {
      if ('function' === typeof opts) {
        cb = opts
        opts = { fs: drive }
      } else if ('object' === typeof opts) {
        opts.fs = drive
      } else {
        opts = {
          fs: drive,
          mode: opts
        }
      }

      mkdirp(dir, opts)
        .then(() => 'function' === typeof cb && cb(null), cb)
        .catch(cb)
    },

    // rm -rf
    rimraf(dir, cb) {
      return rimraf(dir, drive, cb)
    },

    touch(path, cb) {
      drive.access(path, (err) => {
        // does not exist
        if (err) { drive.writeFile(path, Buffer.from('\0'), cb) } else { cb(null) }
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

  if (drive.metadataFeed && !drive.metadata) {
    Object.defineProperty(drive, 'metadata', {
      get() { return drive.metadataFeed }
    })
  }

  if (drive.contentFeed && !drive.content) {
    Object.defineProperty(drive, 'content', {
      get() { return drive.contentFeed }
    })
  }

  return drive
}

module.exports = {
  createCFSDrive
}
