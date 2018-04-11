'use strict'

const { createCFSKeyPath } = require('./key-path')
const { normalizeCFSKey } = require('./key')
const { createCFSDrive } = require('./drive')
const { CFS_ROOT_DIR } = require('./env')
const { destroyCFS } = require('./destroy')
const { resolve } = require('path')
const JSONStream = require('streaming-json-stringify')
const constants = require('./constants')
const isBrowser = require('is-browser')
const collect = require('collect-stream')
const pumpify = require('pumpify')
const pumpcat = require('pumpcat')
const drives = require('./drives')
const crypto = require('./crypto')
const mkdirp = require('mkdirp')
const Batch = require('batch')
const debug = require('debug')('cfsnet:create')
const tree = require('./tree')
const pify = require('pify')
const ram = require('random-access-memory')
const ras = require('random-access-stream')
const ms = require('ms')
const fs = require('fs')

const kLogEventTimeout = ms('10m')
const kEventLogFile = '/var/log/events'
const kCFSIDFile = '/etc/cfs-id'
const $name = Symbol('partition.name')

const identity = (i) => i

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
  eventStream = true,
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
    storage,
    secretKey,
    sparseMetadata,
  })

  // this needs to occur so a key can be generated
  debug("Ensuring CFS drive is ready")
  await new Promise((resolve) => drive.ready(resolve))

  debug("Caching CFS drive in CFSMAP")
  drives[path] = drive

  drive.identifier = id ? Buffer.from(id) : null

  Object.defineProperties(drive, Object.getOwnPropertyDescriptors({
    get partitions() { return partitions },
    get root() { return core },

    get CFSID() { return kCFSIDFile },
    get HOME() {
      const { identifier } = drive
      if (identifier) { return `/home` }
      else { return null }
    },
  }))

  const core = {
    [$name]: 'core',
    resolve: identity,

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

  const fileDescriptors = {}
  const partitions = Object.create({

    resolve(filename) {
      const partitions = this
      const resolved = drive.resolve(filename)
      debug("partitions: resolve: %s -> %s", filename, resolved)
      return parse(filename) || core

      function parse(filename) {
        if ('/' == filename[0]) {
          for (let i = 1; i < filename.length; ++i) {
            const slice = filename.slice(1, i + 1)
            if (slice in partitions) {
              debug("partitions: resolve: parse:", slice)
              return partitions[slice]
            }
          }
        }
        return null
      }
    },

    async create(name, opts) {
      name = name.replace(/^\//, '')
      if (false == name in this) {
        Object.assign(opts, {path: resolve(path, name)})
        this[name] = await createCFSDrive(opts)
        this[name][$name] = name
        // wait for partition to be ready
        await new Promise((resolve) => this[name].ready(resolve))
        // ensure partition exists as child directory in core (root)
        if (core.writable) { await pify(core.mkdirp)(name) }
        Object.assign(this[name], {
          resolve(filename) {
            const regex = RegExp(`^/${name}`)
            const resolved = filename.replace(regex, '')
            debug("partition %s: resolve: %s -> %s", filename, resolved)
            return resolved
          }
        })
      }

      return this[name]
    }
  })

  await createPartition('/etc')
  await createPartition('/lib')
  await createPartition('/tmp')
  await createPartition('/var')

  const home = await partitions.create('/home', {
    sparseMetadata, revision, storage, sparse,
    secretKey: drive.metadata.secretKey,
    key: drive.metadata.key,
  })

  Object.assign(drive, pify({
    async open(filename, flags, mode, cb) {
      if ('function' == typeof filename || null == filename) {
        return core.open(filename)
      }

      if ('string' == typeof filename) {
        filename = drive.resolve(filename)

        // coerce arguments
        if ('function' == typeof flags) {
          cb = flags
          mode = null
          flags = null
        } else if ('function' == typeof mode) {
          cb = mode
          mode = null
        }

        const partition = partitions.resolve(filename)
        filename = partition.resolve(filename)

        // acquire file descriptor
        const fd = await pify(partition.open)(filename, flags, mode)
        if (!fd || fd <= 0) {
          return cb(new Error("AccessDenied"))
        } else {
          fileDescriptors[fd] = partition
          return cb(null, fd)
        }
      }

      // @TODO(werle): use a real CFS error
      return cb(new Error("BadOpenRequest")) // UNREACHABLE
    },

    async stat(filename, cb) {
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      debug("partition: %s: stat: %s", partition[$name], filename)
      filename = partition.resolve(filename)
      return partition.stat(filename, cb)
    },

    async lstat(filename, cb) {
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug("partition: %s: lstat: %s", partition[$name], filename)
      return partition.lstat(filename, cb)
    },

    async close(fd, cb) {
      // close entire CFS
      if (!fd || 'function' == typeof fd) {
        cb = fd
        fd = null
        delete drives[path]
        const batch = new Batch().concurrency(1)

        batch.push((done) => { flushHistoryEvents(done) })

        for (const k in partitions) {
          if (partitions[k] && 'function' == typeof partitions[k].close) {
            batch.push((done) => partitions[k].close(done))
          }
        }

        batch.push((done) => core.close(done))
        return batch.end(cb)
      }

      // close fd in partition
      if (!fd || fd <= 0) {
        return cb(new Error("NotOpened"))
      } else {
        const partition = fileDescriptors[fd]
        if (!partition) {
          return cb(new Error("NotOpened"))
        }
        return partition.close(fd, cb)
      }
    },

    async read(fd, ...args) {
      if (!fd || fd <= 0) {
        throw new Error("NotOpened")
      } else {
        const partition = fileDescriptors[fd]
        if (!partition) {
          throw new Error("NotOpened")
        }
        return partition.read(fd, ...args)
      }
    },

    async rmdir(filename, cb) {
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug("partition: %s: rmdir: %s", partition[$name], filename)
      return partition.rmdir(filename, cb)
    },

    async touch(filename, cb) {
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug("partition: %s: touch: %s", partition[$name], filename)
      return partition.touch(filename, cb)
    },

    async rimraf(filename, cb) {
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug("partition: %s: rimraf: %s", partition[$name], filename)
      return partition.rimraf(filename, cb)
    },

    async unlink(filename, cb) {
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug("partition: %s: unlink: %s", partition[$name], filename)
      return partition.unlink(filename, cb)
    },

    async mkdirp(filename, cb) {
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug("partition: %s: mkdirp: %s", partition[$name], filename)
      return partition.mkdirp(filename, cb)
    },

    async readdir(filename, opts, cb) {
      if ('function' == typeof opts) {
        cb = opts
        opts = {}
      }
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug("partition: %s: readdir: %s", partition[$name], filename)
      return partition.readdir(filename, opts, cb)
    },

    async access(filename, mode, cb) {
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      if ('function' == typeof mode) {
        cb = mode
        mode = constants.F_OK
      }
      debug("partition: %s: access: %s", partition[$name], filename)
      switch (mode) {
        case constants.W_OK:
          if (true !== partition.writable) {
            debug("writable=false")
            return cb(new Error("AccessDenied"))
          }

        case constants.R_OK:
          if (true !== partition.readable) {
            debug("readable=false")
            return cb(new Error("AccessDenied"))
          }

        case constants.F_OK:
          try { await pify(partition.access)(filename) }
          catch (err) {
            debug("F_OK != true")
            debug(err)
            return cb(new Error("AccessDenied"))
          }
          break

        case constants.X_OK:
          return cb(new Error("NotSupported"))
      }

      return cb(null, true)
    },

    async download(filename, cb) {
      if ('function' == typeof filename) {
        filename = null
        cb = filename
      }

      if (null == filename) {
        for (const k in partitions) {
          const partition = partitions[k]
          debug("partition: %s: download", partition[$name])
          await pify(partition.download)()
        }
      } else {
        filename = drive.resolve(filename)
        const partition = partitions.resolve(filename)
        filename = partition.resolve(filename)
        debug("partition: %s: download: %s", partition[$name], filename)
        return partition.download(filename, cb)
      }
    },

    async readFile(filename, opts, cb) {
      if ('function' == typeof opts) {
        cb = opts
        opts = {}
      }

      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug("partition: %s: readFile: %s", partition[$name], filename)
      return partition.readFile(filename, opts, cb)
    },

    async writeFile(filename, buffer, opts, cb) {
      if ('function' == typeof opts) {
        cb = opts
        opts = {}
      }

      if ('string' == typeof buffer) {
        buffer = Buffer.from(buffer)
      } else if (false == Buffer.isBuffer(buffer)) {
        return cb(new TypeError("Expecting bytes to be a Buffer"))
      }

      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug("partition: %s: writeFile: %s", partition[$name], filename)
      return partition.writeFile(filename, buffer, opts, cb)
    },
  }))

  Object.assign(drive, {
    createReadStream(filename, opts) {
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      return partition.createReadStream(filename, opts)
    },

    createWriteStream(filename, opts) {
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      return partition.createWriteStream(filename, opts)
    },

    history(opts) {
      return partitions.home.history(opts)
    },

    replicate(opts) {
      return partitions.home.replicate(opts)
    },

    update(cb) {
      return partitions.home.update(cb)
    },

    ready(cb) {
      return partitions.home.ready(cb)
    },

    resolve(filename) {
      const { HOME } = drive

      if ('string' != typeof filename) {
        throw new TypeError("Expecting filename to be a string")
      }

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
  home.on('update', onupdate)
  home.on('content', onupdate)

  await createIdentifierFile()
  await createFileSystem()

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

  async function createPartition(name) {
    if (false == tree.partitions.includes(name)) {
      throw new TypeError("Invalid partition: " + name)
    }
    name = name.replace(/^\//, '')
    const secretKey = drive.metadata.secretKey || drive.key
    const prefix = Buffer.from(name)
    const seed = Buffer.concat([prefix, secretKey])
    const keyPair = crypto.generateKeyPair(seed)
    await partitions.create(name, {
      sparseMetadata, storage, sparse,
      secretKey: keyPair.secretKey,
      key: keyPair.publicKey,
    })
  }

  async function flushHistoryEvents(done) {
    if (eventStream && drive.writable) {
      const history = drive.history()
      const serialize = JSONStream()
      pumpcat(history, serialize, (err, buf) => {
        if (buf) {
          drive.writeFile(kEventLogFile, buf, done)
        } else {
          done(err)
        }
      })
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

module.exports = {
  createCFSDirectories,
  createCFSFiles,
  createCFS,
}
