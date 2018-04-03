'use strict'

const { createCFSKeyPath } = require('./key-path')
const { normalizeCFSKey } = require('./key')
const { createCFSDrive } = require('./drive')
const { CFS_ROOT_DIR } = require('./env')
const { destroyCFS } = require('./destroy')
const { resolve } = require('path')
const isBrowser = require('is-browser')
const drives = require('./drives')
const crypto = require('./crypto')
const mkdirp = require('mkdirp')
const debug = require('debug')('littlstar:cfs:create')
const tree = require('./tree')
const pify = require('pify')
const ms = require('ms')
const fs = require('fs')

const kLogEventTimeout = ms('10m')
const kCFSIDFile = '/etc/cfs-id'

/**
 * Politely ensure the root CFS directory has access, otherwise
 * create it.
 */
async function ensureCFSRootDirectoryAccess({fs = require('fs')}) {
  debug("Ensuring root CFS directory '%s' has access", CFS_ROOT_DIR)
  try { await pify(fs.access)(CFS_ROOT_DIR) }
  catch (err) { void (err, await pify(mkdirp)(CFS_ROOT_DIR, {fs})) }
}

/**
 * This function will create a CFS based on some input identifier if it does
 * not already exist. An `.id` is required as it is used to generate a SHA256
 * hash string with a hex encoding that will be used to create the
 * CFS storage ID.
 *
 * The "public key" is exposed on the HyperDrive instance as the property
 * `.key`. An optional "discovery public key" can be given for replication
 */
async function createCFS({
  fs = require('fs'),
  id = null,
  key = null,
  path = null,
  latest = true,
  sparse = false,
  storage = null,
  revision = null,
  secretKey = null,
  eventStream = false,
  sparseMetadata = false,
}) {

  if ('string' == typeof storage && false == isBrowser) {
    await ensureCFSRootDirectoryAccess({fs})
  }

  key = normalizeCFSKey(key)
  path = path || createCFSKeyPath({id, key})

  if (path in drives) {
    return drives[path]
  }

  if (id) {
    debug("Creating CFS drive from identifier '%s' with key '%s'", id, key)
  } else {
    debug("Creating CFS drive at path '%s' with key '%s'", path, key)
  }

  // HyperDrive instance
  const drive = await createCFSDrive({
    key,
    path,
    sparse,
    storage,
    revision,
    secretKey,
    sparseMetadata,
  })

  // this needs to occur so a key can be generated
  debug("Ensuring CFS drive is ready")
  await new Promise((resolve) => drive.ready(resolve))
  debug("....Ready !")

  debug("Caching CFS drive in CFSMAP")
  drives[path] = drive

  drive.identifier = id ? Buffer.from(id) : null

  Object.defineProperties(drive, {
    CFSID: {
      get () { return kCFSIDFile }
    },

    HOME: {
      get() {
        const { identifier } = drive
        if (identifier) {
          return `/home`
        } else {
          return null
        }
      }
    },
  })

  const core = {
    open: drive.open,
    stat: drive.stat,
    lstat: drive.lstat,
    close: drive.close,

    read: drive.read,
    rmdir: drive.rmdir,
    touch: drive.touch,
    rimraf: drive.rimraf,
    unlink: drive.unlink,
    mkdirp: drive.mkdirp,
    readdir: drive.readdir,

    access: drive.access,
    download: drive.download,
    readFile: drive.readFile,
    writeFile: drive.writeFile,

    createDiffStream: drive.createDiffStream,
    createReadStream: drive.createReadStream,
    createWriteStream: drive.createWriteStream,
  }

  Object.assign(drive, pify({
    open(filename, flags, mode, cb) {
      return core.open(drive.resolve(filename), flags, mode, cb)
    },

    stat(filename, cb) {
      return core.stat(drive.resolve(filename), cb)
    },

    lstat(filename, cb) {
      return core.lstat(drive.resolve(filename), cb)
    },

    close(fd, cb) {
      if ('function' == typeof fd) {
        cb = fd
        fd = null
        delete drives[path]
        return core.close(cb)
      } else if (fd && cb) {
        return core.close(fd, cb)
      } else {
        return core.close(fd, cb)
      }
    },

    read(...args) {
      return core.read(...args)
    },

    rmdir(filename, cb) {
      return core.rmdir(drive.resolve(filename), cb)
    },

    touch(filename, cb) {
      return core.touch(drive.resolve(filename), cb)
    },

    rimraf(filename, cb) {
      return core.rimraf(drive.resolve(filename), cb)
    },

    unlink(filename, cb) {
      return core.unlink(drive.resolve(filename), cb)
    },

    mkdirp(filename, cb) {
      return core.mkdirp(drive.resolve(filename), cb)
    },

    readdir(filename, opts, cb) {
      return core.readdir(drive.resolve(filename), opts, cb)
    },

    access(filename, cb) {
      return core.access(drive.resolve(filename), cb)
    },

    download(filename, cb) {
      if ('function' == typeof filename) {
        cb = filename
        return core.download(cb)
      } else if ('string' == typeof filename) {
        return core.download(drive.resolve(filename), cb)
      } else {
        return core.download(filename, cb)
      }
    },

    readFile(filename, opts, cb) {
      return core.readFile(drive.resolve(filename), opts, cb)
    },

    writeFile(filename, buffer, opts, cb) {
      return core.writeFile(drive.resolve(filename), buffer, opts, cb)
    },
  }))

  Object.assign(drive, {
    createReadStream(filename, opts) {
      return core.createReadStream(drive.resolve(filename), opts)
    },

    createWriteStream(filename, opts) {
      return core.createWriteStream(drive.resolve(filename), opts)
    },

    update(...args) {
      if (drive.metadata) {
        drive.metadata.update(...args)
      }
      return drive
    },

    resolve(filename) {
      const { HOME } = drive
      debug("resolve: HOME=%s filename=%s", HOME, filename)

      if (HOME) {
        return resolve(HOME, parse(filename))
      } else {
        return filename
      }

      function parse(filename) {
        if ('string' != typeof filename) {
          return '.'
        }
        // $1 is matched group after optional tilde
        filename = filename.replace(/^~\//, '')

        return filename
      }
    }
  })

  drive.ready(onready)
  drive.on('update', onupdate)
  drive.on('content', onupdate)

  await createIdentifierFile()
  await createFileSystem()
  await createHome()

  if (drive.identifier) {
    process.nextTick(() => onidentifier(drive.identifier))
  } else {
    await onupdate()
  }

  return drive

  async function onready() {
    debug("onready")
  }

  async function onidentifier(identifier) {
    debug("onidentifier:", identifier)
    drive.emit('id', drive.identifier)
    drive.emit('identifier', drive.identifier)
  }

  async function onupdate() {
    debug("onupdate")
    try {
      await pify(drive.access)(kCFSIDFile)
      if (null == drive.identifier) {
        drive.identifier = await pify(drive.readFile)(kCFSIDFile)
      }
      onidentifier(drive.identifier)
    } catch (err) {
      debug("onupdate: error:", err)
    }
  }

  async function createFileSystem() {
    debug("init: system")
    debug("Ensuring file system integrity" )
    if (id && drive.writable) {
      await createCFSDirectories({id, path, drive, key, sparse})
      await createCFSFiles({id, path, drive, key, sparse})

      if ('function' == typeof drive.flushEvents) {
        debug("Flushing events")
        await drive.flushEvents()
      }

      if (eventStream) {
        await createCFSEventStream({path, drive, enabled: eventStream})
      }
    }
  }

  async function createIdentifierFile() {
    debug("init: id")
    if (id && drive.writable) {
      try { await pify(drive.access)(kCFSIDFile) }
      catch (err) { await pify(drive.writeFile)(kCFSIDFile, Buffer.from(id)) }
    } else {
      await onupdate()
    }
  }

  async function createHome() {
    const { HOME } = drive
    if (drive.identifier) {
      debug("init: home")
      if (drive.writable && HOME) {
        try { await pify(drive.access)(drive.HOME) }
        catch (err) { await pify(drive.mkdirp)(drive.HOME) }
      }
    }
  }
}

/**
 * This function creates the core CFS directories. The directory structure is
 * very similar to a Linux filesystem, or FHS (Filesystem Hierarchy Standard).
 *
 * The following directories are supported:
 *
 *  * / - The root of the CFS
 *  * /home - Contains directories of groups containing directories of users
 *    * /home/<group> - Group level hierarchy
 *    * /home/<group>/<user> - User level hierarchy with personal settings and configuration
 *  * /lib - Libraries essential to the user
 *  * /tmp - Temporary files
 *  * /var - Contains file that change often
 *  * /var/log - Contains log files for events that occur on the CFS
 *  * /var/cache - Contains cached files
 *
 */
async function createCFSDirectories({id, path, drive, key, sparse}) {
  path = path || createCFSKeyPath({id, key})
  drive = drive || drives[path] || await createCFSDrive({path, key, sparse})
  debug("Ensuring CFS directories for '%s' with key '%s'",
    path, drive.key.toString('hex'))
  for (const dir of tree.directories) {
    debug("Ensuring directory '%s'", dir)
    try { await pify(drive.stat)(dir) }
    catch (err) { await pify(drive.mkdirp)(dir) }
  }
}

async function createCFSFiles({id, path, drive, key, sparse}) {
  path = path || createCFSKeyPath({id})
  drive = drive || drives[path] || await createCFSDrive({path, key, sparse})
  debug("Ensuring CFS files for '%s' with key '%s'",
    path, drive.key.toString('hex'))

  try {
    const signatureFile = '/etc/cfs-signature'
    try { await pify(drive.access)(signatureFile) }
    catch (err) {
      const signature = crypto.hash(Buffer.concat([
        drive.identifier, drive.key, drive.metadata.secretKey
      ]))
      debug("Writing CFS signature '%s' to %s", signature, signatureFile)
      await pify(drive.writeFile)(signatureFile, Buffer.from(signature))
    }
  } catch (err) {
    debug("Failed to create `/etc/cfs-signature' file", err)
  }

  try {
    const epochFile = '/etc/cfs-epoch'
    try { await pify(drive.access)(epochFile) }
    catch (err) {
      const timestamp = String((Date.now()/1000)|0) // in seconds
      debug("Writing CFS epoch '%s' to %s", timestamp, epochFile)
      await pify(drive.writeFile)(epochFile, Buffer.from(timestamp))
    }
  } catch (err) {
    debug("Failed to create `/etc/cfs-epoch' file", err)
  }

  for (const file of tree.files) {
    debug("Ensuring file '%s'", file)
    try { await pify(drive.stat)(file) }
    catch (err) { await pify(drive.touch)(file) }
  }
}

async function createCFSEventStream({drive, enabled = true}) {
  if (drive.hasEventStream) { return }
  const log = '/var/log/events'
  await pify(drive.ready)()
  await pify(drive.touch)(log)
  const timestamp = () => Math.floor(Date.now()/1000) // unix timestamp (seconds)
  let eventCount = 0
  let timeout = 0
  let logIndex = 0
  let logsSeen = 0
  let logs = null
  try {
    await new Promise(async (resolve, reject) => {
      setTimeout(reject, 250)
      await pify(drive.access)(log)
      logs = String(await pify(drive.readFile)(log)).split('\n')
    })
  } catch (err) {
    logs = []
  } finally {
    logIndex = logs.length
  }

  if (enabled) {
    timeout = setTimeout(flushEvents, kLogEventTimeout)
    setTimeout(flushEvents, 0)
    drive.history({live: true}).on('data', async (event) => {
      if (log == event.name) { return }
      if (logsSeen++ < logIndex) { return }
      Object.assign(event, {timestamp: timestamp()})
      const entry = JSON.stringify(event)
      debug("event:", entry)
      logs.push(entry)
      if (++eventCount > 10) { await flushEvents() }
    })
    process.once('exit', async () => await flushEvents())
  }
  drive.hasEventStream = true
  drive.flushEvents = flushEvents
  async function flushEvents() {
    clearTimeout(timeout)
    timeout = setTimeout(flushEvents, kLogEventTimeout)
    if (0 == eventCount) { return }
    logs.push(JSON.stringify({type: "flush", timestamp: timestamp()}))
    debug("Flushing logs to '%s'", log)
    await pify(drive.writeFile)(log, logs.join('\n'))
    eventCount = 0
  }
}

module.exports = {
  createCFSDirectories,
  createCFSFiles,
  createCFS,
}
