const { createCFSKeyPath } = require('./key-path')
const { normalizeCFSKey } = require('./key')
const { createCFSDrive } = require('./drive')
const { resolve } = require('path')
const JSONStream = require('streaming-json-stringify')
const constants = require('./constants')
const isBrowser = require('is-browser')
const unixify = require('unixify')
const pumpcat = require('pumpcat')
const drives = require('./drives')
const crypto = require('./crypto')
const mkdirp = require('mkdirp')
const Batch = require('batch')
const debug = require('debug')('cfsnet:create')
const tree = require('./tree')
const pify = require('pify')
const env = require('./env')
const raf = require('random-access-file')
const ram = require('random-access-memory')
const ms = require('ms')

const kLogEventTimeout = ms('10m') // eslint-disable-line no-unused-vars
const kEventLogFile = '/var/log/events'
const kCFSIDFile = '/etc/cfs-id'

const $name = Symbol('partition.name')

const identity = i => i

/**
 * Politely ensure the root CFS directory has access, otherwise
 * create it.
 */
async function ensureCFSRootDirectoryAccess({ fs = require('fs') }) {
  debug("Ensuring root CFS directory '%s' has access", env.CFS_ROOT_DIR)
  try {
    await pify(fs.access)(env.CFS_ROOT_DIR)
  } catch (err) {
    void (err, await pify(mkdirp)(env.CFS_ROOT_DIR, { fs })) // eslint-disable-line no-void
  }
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
  latest = false,
  sparse = false,
  shallow = false,
  storage = null,
  revision = null,
  secretKey = null,
  eventStream = true,
  sparseMetadata = false,
}) {
  if ('string' === typeof storage && false == isBrowser) {
    await ensureCFSRootDirectoryAccess({ fs })
  }

  key = normalizeCFSKey(key)
  path = path || createCFSKeyPath({ id, key })

  if (path in drives) {
    return drives[path]
  }

  if (id) {
    debug("Creating CFS drive from identifier '%s' with key '%s'", id, key)
  } else {
    debug("Creating CFS drive at path '%s' with key '%s'", path, key)
  }

  if (revision && 'number' === typeof revision) {
    latest = false
  }

  // root HyperDrive instance
  const drive = await createCFSDrive({
    key,
    path,
    secretKey,
    latest: true,
    storage(file, drive, path) { // eslint-disable-line no-shadow
      if (file.includes('content')) {
        return ram()
      } else if ('function' === typeof storage) {
        return storage(file, drive, path)
      }
      return raf(resolve(path, file))
    }
  })

  // this needs to occur so a key can be generated
  debug('Ensuring CFS drive is ready')
  await pify(drive.ready)()
  /*
   * this ensures "root" directory actually has a "Stat" in
   * its metatdata
   */
  if (drive.writable) {
    try {
      await pify(drive.access)('/')
      const { mtime, ctime } = await pify(drive.stat)('/')
      if (0 == Number(mtime) || 0 == Number(ctime)) {
        // just throw something to switch to `catch' context
        throw new Error()
      }
    } catch (err) {
      try {
        await pify(drive.mkdir)('/')
      } catch (error) {
        debug(error)
      }
    }
  }

  debug('Caching CFS drive in CFSMAP')
  drives[path] = drive

  const fileDescriptors = {}
  let identifier = id // eslint-disable-line no-nested-ternary
    ? (Buffer.isBuffer(id) ? id : Buffer.from(id))
    : null

  const root = {
    [$name]: 'root',
    resolve: identity,
    history: drive.history,

    open: drive.open,
    stat: drive.stat,
    lstat: drive.lstat,
    close: drive.close,

    read: drive.read,
    rmdir: drive.rmdir,
    touch: drive.touch,
    rimraf: drive.rimraf,
    unlink: drive.unlink,
    mkdir: drive.mkdir,
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

  const partitions = Object.create({

    resolve(filename) {
      const partitions = this // eslint-disable-line no-shadow
      const resolved = drive.resolve(filename)
      debug('partitions: resolve: %s -> %s', filename, resolved)
      if ('/' == resolved) { return root }
      return parse(resolved) || root

      // eslint-disable-next-line no-shadow
      function parse(filename) { // eslint-disable-line consistent-return
        // Strip Win32 drives from a filename
        function stripWinDrives(winFilename) {
          const regex = /^.:/
          return winFilename.replace(regex, '')
        }

        // Determine if the filename is a top level directory
        function isTopDir(topFilename) {
          return ('/' === topFilename[0] || '\\' === topFilename[0])
        }

        if ('win32' === process.platform) {
          filename = stripWinDrives(filename)
        }

        if (filename in partitions) {
          debug('partitions: resolve: parse:', filename)
          return partitions[filename]
        } else if (isTopDir(filename)) {
          for (let i = 1; i < filename.length; ++i) {
            const slice = filename.slice(1, i + 1)
            if (slice in partitions) {
              debug('partitions: resolve: parse:', slice)
              return partitions[slice]
            }
          }
          return null
        }
      }
    },

    async create(name, opts) {
      name = name.replace(/^\//, '')
      if (false == name in this) {
        Object.assign(opts, { path: resolve(path, name) })
        const partition = await createCFSDrive(opts)
        this[name] = partition
        this[name][$name] = name

        // wait for partition to be ready
        await new Promise(resolve => partition.ready(resolve)) // eslint-disable-line no-shadow

        // ensure partition has root access
        try {
          await pify(partition.access)('/')
          const { mtime, ctime } = await pify(partition.stat)('/')
          if (0 == Number(mtime) || 0 == Number(ctime)) {
            // just throw something to switch to `catch' context
            throw new Error()
          }
        } catch (err) {
          if (partition.writable) {
            try {
              await pify(partition.mkdir)('/')
            } catch (error) {
              debug(error)
            }
          }
        }

        // ensure partition exists as child directory in root (root)
        try { await pify(root.access)(resolve('/', name)) } catch (err) {
          if (drive.writable) {
            await pify(root.mkdirp)(resolve('/', name))
          }
        }

        Object.assign(partition, {
          resolve(filename) {
            const regex = RegExp(`^/${name}`)
            const resolved = unixify(filename).replace(regex, '')
            debug('partition %s: resolve: %s -> %s', filename, resolved)
            return resolved
          }
        })

        drive.emit('partition', this[name], name)
      }

      return this[name]
    }
  })

  Object.defineProperties(drive, Object.getOwnPropertyDescriptors({
    get fileDescriptors() { return fileDescriptors },
    get identifier() { return identifier },
    get partitions() { return partitions },
    get root() { return root },

    get CFSID() { return kCFSIDFile },
    get TMPDIR() { return this.TMP },
    get HOME() { return '/home' },
    get LIB() { return '/lib' },
    get ETC() { return '/etc' },
    get VAR() { return '/var' },
    get TMP() { return '/tmp' }
  }))

  await createPartition(drive.ETC, shallow ? ram : null)
  await createPartition(drive.LIB, shallow ? ram : null)
  await createPartition(drive.TMP, ram)
  await createPartition(drive.VAR, shallow ? ram : null)

  const home = await partitions.create(drive.HOME, {
    sparseMetadata,
    revision,
    storage,
    sparse,
    latest,
    secretKey: drive.metadata.secretKey,
    key: drive.metadata.key,
  })

  // root drive API
  Object.assign(drive, pify({
    async open(filename, flags, mode, cb) {
      if ('function' === typeof filename || null == filename) {
        return root.open(filename)
      }

      if ('string' === typeof filename) {
        filename = drive.resolve(filename)

        // coerce arguments
        if ('function' === typeof flags) {
          cb = flags
          mode = null
          flags = null
        } else if ('function' === typeof mode) {
          cb = mode
          mode = null
        }

        const partition = partitions.resolve(filename)
        filename = partition.resolve(filename)

        // acquire file descriptor
        const fd = await pify(partition.open)(filename, flags, mode)
        if (!fd || fd <= 0) {
          return cb(new Error('AccessDenied'))
        }
        fileDescriptors[fd] = partition
        return cb(null, fd)
      }

      // @TODO(werle): use a real CFS error -- UNREACHABLE
      return cb(new Error('BadOpenRequest'))
    },

    async stat(filename, opts, cb) {
      if ('function' === typeof opts) {
        cb = opts
        opts = {}
      }
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      debug('partition: %s: stat: %s', partition[$name], filename)
      if (filename.slice(1) in partitions) {
        return root.stat(filename, opts, cb)
      }
      filename = partition.resolve(filename)
      return partition.stat(filename, opts, cb)
    },

    async lstat(filename, opts, cb) {
      if ('function' === typeof opts) {
        cb = opts
        opts = {}
      }
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      debug('partition: %s: lstat: %s', partition[$name], filename)
      if (filename.slice(1) in partitions) {
        return root.lstat(filename, opts, cb)
      }
      filename = partition.resolve(filename)
      return partition.lstat(filename, opts, cb)
    },

    async close(fd, cb) {
      // close entire CFS
      if (!fd || 'function' === typeof fd) {
        cb = fd
        fd = null
        delete drives[path]
        const batch = new Batch().concurrency(1)

        batch.push((done) => { flushHistoryEvents(done) })

        for (const k in partitions) {
          if (partitions[k] && 'function' === typeof partitions[k].close) {
            batch.push(done => partitions[k].close(done))
          }
        }

        batch.push(done => root.close(done))
        return batch.end(cb)
      }

      // close fd in partition
      if (!fd || fd <= 0) {
        return cb(new Error('NotOpened'))
      }
      const partition = fileDescriptors[fd]
      if (!partition) {
        return cb(new Error('NotOpened'))
      }
      return partition.close(fd, cb)
    },

    async read(fd, ...args) {
      let cb
      if ('function' === typeof fd) {
        cb = fd
        fd = -1
      } else {
        cb = args.slice(-1)[0] // eslint-disable-line prefer-destructuring
      }

      if (!fd || fd <= 0 || 'function' === typeof fd) {
        return cb(new Error('NotOpened'))
      }
      const partition = fileDescriptors[fd]
      if (!partition) {
        return cb(new Error('NotOpened'))
      }
      return partition.read(fd, ...args)
    },

    async rmdir(filename, cb) {
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug('partition: %s: rmdir: %s', partition[$name], filename)
      return partition.rmdir(filename, cb)
    },

    async touch(filename, cb) {
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug('partition: %s: touch: %s', partition[$name], filename)
      return partition.touch(filename, cb)
    },

    async rimraf(filename, cb) {
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug('partition: %s: rimraf: %s', partition[$name], filename)
      return partition.rimraf(filename, cb)
    },

    async unlink(filename, cb) {
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug('partition: %s: unlink: %s', partition[$name], filename)
      return partition.unlink(filename, cb)
    },

    async mkdir(filename, opts, cb) {
      if ('function' === typeof opts) {
        cb = opts
        opts = {}
      }
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug('partition: %s: mkdir: %s', partition[$name], filename)
      return partition.mkdir(filename, opts, cb)
    },

    async mkdirp(filename, opts, cb) {
      if ('function' === typeof opts) {
        cb = opts
        opts = {}
      }
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug('partition: %s: mkdirp: %s', partition[$name], filename)
      return partition.mkdirp(filename, opts, cb)
    },

    async readdir(filename, opts, cb) {
      if ('function' === typeof opts) {
        cb = opts
        opts = {}
      }
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug('partition: %s: readdir: %s', partition[$name], filename)
      return partition.readdir(filename, opts, cb)
    },

    /* eslint-disable no-fallthrough */
    async access(filename, mode, cb) {
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      if ('function' === typeof mode) {
        cb = mode
        mode = constants.F_OK
      }
      debug('partition: %s: access: %s', partition[$name], filename)
      switch (mode) {
      case constants.W_OK:
        if (true !== partition.writable) {
          debug('writable=false')
          return cb(new Error('AccessDenied'))
        }

      case constants.R_OK:
        if (true !== partition.readable) {
          debug('readable=false')
          return cb(new Error('AccessDenied'))
        }

      case constants.F_OK:
        try { await pify(partition.access)(filename) } catch (err) {
          debug('F_OK != true')
          debug(err)
          return cb(new Error('AccessDenied'))
        }
        break

      case constants.X_OK:
        return cb(new Error('NotSupported'))

      default:
        return cb(new Error('NotSupported'))
      }
      return cb(null, true)
    },
    /* eslint-enable no-fallthrough */

    async download(filename, cb) { // eslint-disable-line consistent-return
      if ('function' === typeof filename) {
        filename = null
        cb = filename
      }

      if (null == filename) {
        for (const k in partitions) {
          const partition = partitions[k]
          debug('partition: %s: download', partition[$name])
          await pify(partition.download)() // eslint-disable-line no-await-in-loop
        }
      } else {
        filename = drive.resolve(filename)
        const partition = partitions.resolve(filename)
        filename = partition.resolve(filename)
        debug('partition: %s: download: %s', partition[$name], filename)
        return partition.download(filename, cb)
      }
    },

    async readFile(filename, opts, cb) {
      if ('function' === typeof opts) {
        cb = opts
        opts = {}
      }

      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug('partition: %s: readFile: %s', partition[$name], filename)
      return partition.readFile(filename, opts, cb)
    },

    async writeFile(filename, buffer, opts, cb) {
      if ('function' === typeof opts) {
        cb = opts
        opts = {}
      }

      if ('string' === typeof buffer) {
        buffer = Buffer.from(buffer)
      } else if (false == Buffer.isBuffer(buffer)) {
        return cb(new TypeError('Expecting bytes to be a Buffer'))
      }

      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug('partition: %s: writeFile: %s', partition[$name], filename)
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

    history(name, opts) {
      if ('object' === typeof name) {
        opts = name || {}
        name = drive.HOME
      }

      name = name || drive.HOME
      return partitions.resolve(name).history(opts)
    },

    replicate(name, opts) {
      if ('object' === typeof name) {
        opts = name || {}
        name = drive.HOME
      }

      name = name || drive.HOME
      return partitions.resolve(name).replicate(opts)
    },

    update(name, cb) {
      if ('function' === typeof name) {
        cb = name
        name = drive.HOME
      }

      name = name || drive.HOME
      return partitions.resolve(name).metadata.update(cb)
    },

    ready(name, cb) {
      if ('function' === typeof name) {
        cb = name
        name = drive.HOME
      }

      name = name || drive.HOME
      return partitions.resolve(name).ready(cb)
    },

    resolve(filename) {
      const { HOME } = drive

      if ('string' !== typeof filename) {
        throw new TypeError('Expecting filename to be a string')
      }

      filename = unixify(filename)
      debug('resolve: HOME=%s filename=%s', HOME, filename)

      return unixify(resolve(HOME, parse(filename)))

      function parse(filename) { // eslint-disable-line no-shadow
        if ('string' !== typeof filename) {
          return '.'
        }
        filename = filename.replace(/^~\/?/, '')
        return filename
      }
    }
  })

  drive.ready(onready)
  home.on('update', onupdate)
  home.on('content', onupdate)

  proxyEvent('append')
  proxyEvent('appending')
  proxyEvent('close')
  proxyEvent('content')
  proxyEvent('download')
  proxyEvent('error')
  proxyEvent('update')
  proxyEvent('upload')
  proxyEvent('ready')
  proxyEvent('sync')
  proxyEvent('syncing')

  await createIdentifierFile()
  await createFileSystem()

  if (identifier) {
    process.nextTick(() => onidentifier(identifier))
  } else {
    await onupdate()
  }

  return drive

  function proxyEvent(event) {
    home.on(event, (...args) => { drive.emit(event, ...args) })
  }

  async function onready() {
    debug('onready')
  }

  async function onidentifier(id) { // eslint-disable-line no-shadow
    identifier = id
    debug('onidentifier:', identifier)
    drive.emit('id', identifier)
    drive.emit('identifier', identifier)
  }

  async function onupdate() {
    debug('onupdate')
    try {
      await pify(drive.access)(kCFSIDFile)
      if (null == identifier) {
        identifier = await pify(drive.readFile)(kCFSIDFile)
      }
      onidentifier(identifier)
    } catch (err) {
      debug('onupdate: error:', err)
    }
  }

  async function createFileSystem() {
    debug('init: system')
    debug('Ensuring file system integrity')
    if (id && drive.writable) {
      await createCFSDirectories({
        id, path, drive, key, sparse
      })
      await createCFSFiles({
        id, path, drive, key, sparse
      })
    }
  }

  async function createIdentifierFile() {
    debug('init: id')
    if (id && drive.writable) {
      try {
        await pify(drive.access)(kCFSIDFile)
      } catch (err) {
        await pify(drive.writeFile)(kCFSIDFile, Buffer.from(id))
      }
    } else {
      await onupdate()
    }
  }

  async function createPartition(name, storageOverride) {
    if (false == tree.partitions.includes(name)) {
      throw new TypeError(`Invalid partition: ${name}`)
    }
    name = name.replace(/^\//, '')
    secretKey = drive.metadata.secretKey || drive.key
    const prefix = Buffer.from(name)
    const seed = Buffer.concat([prefix, secretKey])
    const keyPair = crypto.generateKeyPair(seed)
    await partitions.create(name, {
      sparseMetadata,
      sparse,

      secretKey: keyPair.secretKey,
      storage: storageOverride || storage,
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
 * This function creates the root CFS directories. The directory structure is
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
async function createCFSDirectories({
  id, path, drive, key, sparse
}) {
  path = path || createCFSKeyPath({ id, key })
  drive = drive || drives[path] || await createCFSDrive({ path, key, sparse })
  debug(
    "Ensuring CFS directories for '%s' with key '%s'",
    path, drive.key.toString('hex')
  )
  for (const dir of tree.directories) {
    debug("Ensuring directory '%s'", dir)
    try {
      await pify(drive.stat)(dir) // eslint-disable-line no-await-in-loop
    } catch (err) {
      await pify(drive.mkdirp)(dir) // eslint-disable-line no-await-in-loop
    }
  }
}

async function createCFSFiles({
  id, path, drive, key, sparse
}) {
  path = path || createCFSKeyPath({ id })
  drive = drive || drives[path] || await createCFSDrive({ path, key, sparse })
  debug(
    "Ensuring CFS files for '%s' with key '%s'",
    path, drive.key.toString('hex')
  )

  try {
    const signatureFile = '/etc/cfs-signature'
    try { await pify(drive.access)(signatureFile) } catch (err) {
      const signature = crypto.sha256(Buffer.concat([
        drive.identifier, drive.key, drive.metadata.secretKey
      ]))
      debug("Writing CFS signature '%s' to %s", signature.toString('hex'), signatureFile)
      await pify(drive.writeFile)(signatureFile, signature)
    }
  } catch (err) {
    debug("Failed to create `/etc/cfs-signature' file", err)
  }

  try {
    const epochFile = '/etc/cfs-epoch'
    try { await pify(drive.access)(epochFile) } catch (err) {
      // in seconds
      const timestamp = String((Date.now() / 1000) | 0) // eslint-disable-line no-bitwise
      debug("Writing CFS epoch '%s' to %s", timestamp, epochFile)
      await pify(drive.writeFile)(epochFile, Buffer.from(timestamp))
    }
  } catch (err) {
    debug("Failed to create `/etc/cfs-epoch' file", err)
  }

  for (const file of tree.files) {
    debug("Ensuring file '%s'", file)
    try {
      await pify(drive.stat)(file) // eslint-disable-line no-await-in-loop
    } catch (err) {
      await pify(drive.touch)(file) // eslint-disable-line no-await-in-loop
    }
  }
}

module.exports = {
  createCFSDirectories,
  createCFSFiles,
  createCFS,
}
