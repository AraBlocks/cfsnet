'use strict'

const hyperdrive = require('hyperdrive')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const debug = require('debug')('littlstar:cfs:create:drive')
const pify = require('pify')

async function createCFSDrive({path, discoveryKey} = {}) {
  const drive = hyperdrive(path, discoveryKey ? discoveryKey : undefined)
  // wait for drive to be ready
  await new Promise((resolve) => drive.ready(resolve))
  debug("Initializing CFS HyperDrive instance at '%s' with discoveryKey '%s'",
    path,
    (drive.discoveryKey || drive.key).toString('hex'))

  // these methods are promisified to enable usage of
  // the `async/await` keywords
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

  // original fs preserved before being promisified with pify
  const fs = {}
  const fsdebug = require('debug')('littlstar:cfs:drive:fs')
  Object.assign(drive, methods.reduce((d, m) => {
    fs[m] = drive[m].bind(drive)
    return Object.assign(d, {[m]: (...args) => {
      fsdebug("call %s", m, String(args[0]))
      return pify(fs[m])(...args)
    }})
  }, {}))

  // monkey patch to throw correct fs error
  const {rmdir} = fs
  fs.rmdir = (dir, cb) => {
    rmdir(dir, (err) => {
      if (err) {
        if (err.message.toLowerCase().match(/directory is not empty/)) {
          return cb(Object.assign(new Error('ENOTEMPTY'), {
            code: 'ENOTEMPTY'
          }))
        }
      }

      cb(err)
    })
  }

  // extra useful methods
  Object.assign(drive, {
    fs: fs,
    async mkdirp(dir) {
      return pify(mkdirp)(dir, {fs})
    },

    async rimraf(dir) {
      return pify(rimraf)(dir, fs)
    },

    async touch(path) {
      try { await pify(fs.access)(path) }
      catch (err) {
        // does not exist
        return pify(fs.writeFile)(path, '')
      }
    },
  })

  return drive
}

module.exports = {
  createCFSDrive
}
