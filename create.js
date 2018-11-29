/* eslint-disable global-require */
/* eslint-disable no-await-in-loop */
const { createCFSKeyPath } = require('./key-path')
const { normalizeCFSKey } = require('./key')
const { createCFSDrive } = require('./drive')
const { resolve } = require('path')
const JSONStream = require('streaming-json-stringify')
const constants = require('./constants')
const isBrowser = require('is-browser')
const isBuffer = require('is-buffer')
const unixify = require('unixify')
const pumpcat = require('pumpcat')
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

const $PARTITION_NAME = Symbol('partition name')
const EVENT_LOG_FILE = '/var/log/events'

const identity = i => i

/**
 * This function will create a CFS based on some input identifier if it does
 * not already exist. An `.id` is required as it is used to generate a SHA256
 * hash string with a hex encoding that will be used to create the
 * CFS storage ID.
 *
 * The 'public key' is exposed on the HyperDrive instance as the property
 * `.key`. An optional 'discovery public key' can be given for replication
 */
async function createCFS(opts) {
  if (!opts) {
    opts = {}
  }

  if (!opts.id && opts.identifier) {
    opts.id = opts.identifier
  }

  const {
    sparseMetadata = false,
    eventStream = true,
    revision = null,
    shallow = false,
    storage = null,
    sparse = false,
    fs = require('fs'),
    id = null,
  } = opts

  if (!opts.partitions) {
    opts.partitions = {}
  }

  let {
    latest = false,
    secretKey = null,
  } = opts

  const key = normalizeCFSKey(opts.key)
  const path = opts.path || createCFSKeyPath({ id, key })

  if ('string' === typeof storage && false === isBrowser) {
    await ensureCFSRootDirectoryAccess({ fs })
  }

  if (revision && 'number' === typeof revision) {
    latest = false
  }

  // root HyperDrive instance
  const drive = await createCFSDrive({
    latest: true,

    secretKey,
    path,
    key,

    storage(file, drive, path) {
      if (file.includes('content')) {
        return ram()
      } else if ('function' === typeof storage) {
        return storage(file, drive, path)
      }
      return raf(resolve(path, file))
    }
  })

  debug('drive created:', id, key, path)

  // this needs to occur so a key can be generated
  debug('drive ready:', id, key)
  await pify(drive.ready)()
  await ensureDriveRoot(drive)

  const root = createRoot(drive)
  const partitions = createPartitionManager(path, root, drive)

  const fileDescriptors = {}
  let identifier = null

  if (isBuffer(id)) {
    identifier = id
  } else if (id) {
    identifier = Buffer.from(id)
  }

  Object.defineProperties(drive, Object.getOwnPropertyDescriptors({
    get fileDescriptors() { return fileDescriptors },
    get identifier() { return identifier },
    get partitions() { return partitions },
    get version() { return (partitions.home && partitions.home.version) || null },
    get root() { return root },

    get CFSSIGNATURE() { return '/etc/cfs-signature' },
    get CFSEPOCH() { return '/etc/cfs-epoch' },
    get CFSKEY() { return '/etc/cfs-key' },
    get CFSID() { return '/etc/cfs-id' },

    get TMPDIR() { return this.TMP },
    get HOME() { return '/home' },
    get LIB() { return '/lib' },
    get ETC() { return '/etc' },
    get VAR() { return '/var' },
    get TMP() { return '/tmp' }
  }))

  await createPartition(drive.ETC, shallow ? ram : null, opts.partitions.etc)
  await createPartition(drive.LIB, shallow ? ram : null, opts.partitions.lib)
  await createPartition(drive.TMP, ram)
  await createPartition(drive.VAR, shallow ? ram : null, opts.partitions.var)

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

      return cb(new Error('BadOpenRequest'))
    },

    async stat(filename, opts, cb) {
      if ('function' === typeof opts) {
        cb = opts
        opts = {}
      }

      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)

      debug(
        'partition: %s: stat: %s',
        partition[$PARTITION_NAME],
        filename
      )

      // stat on partition path (ie /tmp or /home)
      if (drive.writable && filename.slice(1) in partitions) {
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

      debug(
        'partition: %s: lstat: %s',
        partition[$PARTITION_NAME],
        filename
      )

      // stat on partition path (ie /tmp or /home)
      if (drive.writable && filename.slice(1) in partitions) {
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
        const batch = new Batch().concurrency(1)

        batch.push((done) => { flushHistoryEvents(done) })

        for (const k in partitions) {
          if (partitions[k] && 'function' === typeof partitions[k].close) {
            batch.push(done => partitions[k].close(done))
          }
        }

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
        // eslint-disable-next-line prefer-destructuring
        cb = args.slice(-1)[0]
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
      debug('partition: %s: rmdir: %s', partition[$PARTITION_NAME], filename)
      return partition.rmdir(filename, cb)
    },

    async touch(filename, cb) {
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug('partition: %s: touch: %s', partition[$PARTITION_NAME], filename)
      return partition.touch(filename, cb)
    },

    async rimraf(filename, cb) {
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug('partition: %s: rimraf: %s', partition[$PARTITION_NAME], filename)
      return partition.rimraf(filename, cb)
    },

    async unlink(filename, cb) {
      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug('partition: %s: unlink: %s', partition[$PARTITION_NAME], filename)
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
      debug('partition: %s: mkdir: %s', partition[$PARTITION_NAME], filename)
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
      debug('partition: %s: mkdirp: %s', partition[$PARTITION_NAME], filename)
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
      debug('partition: %s: readdir: %s', partition[$PARTITION_NAME], filename)
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
      debug('partition: %s: access: %s', partition[$PARTITION_NAME], filename)
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
        try {
          await pify(partition.access)(filename)
        } catch (err) {
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
          if (partition && 'function' === typeof partition.download) {
            debug('partition: %s: download', partition[$PARTITION_NAME])
            await pify(partition.download)()
          }
        }
      } else {
        filename = drive.resolve(filename)
        const partition = partitions.resolve(filename)
        filename = partition.resolve(filename)
        debug('partition: %s: download: %s', partition[$PARTITION_NAME], filename)
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
      debug('partition: %s: readFile: %s', partition[$PARTITION_NAME], filename)
      return partition.readFile(filename, opts, cb)
    },

    async writeFile(filename, buffer, opts, cb) {
      if ('function' === typeof opts) {
        cb = opts
        opts = {}
      }

      if ('string' === typeof buffer) {
        buffer = Buffer.from(buffer)
      } else if (false === isBuffer(buffer)) {
        return cb(new TypeError('Expecting bytes to be a Buffer'))
      }

      filename = drive.resolve(filename)
      const partition = partitions.resolve(filename)
      filename = partition.resolve(filename)
      debug('partition: %s: writeFile: %s', partition[$PARTITION_NAME], filename)
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

  void [
    'append', 'appending', 'close',
    'content', 'download', 'error',
    'update', 'upload', 'ready',
    'sync', 'syncing'
  ].map(proxyEvent)

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
    debug('drive ready:', identifier)
  }

  async function onidentifier(newid) { // eslint-disable-line no-shadow
    identifier = newid
    drive.emit('id', identifier)
    drive.emit('identifier', identifier)
    debug('drive identifier:', identifier)
  }

  async function onupdate() {
    debug('drive update:', identifier)
    try {
      await pify(drive.access)(drive.CFSID)
      if (null == identifier) {
        identifier = await pify(drive.readFile)(drive.CFSID)
      }
      onidentifier(identifier)
    } catch (err) {
      debug('onupdate: error:', err)
    }
  }

  async function createFileSystem() {
    if (id && drive.writable) {
      await createCFSDirectories({
        id, path, drive, key, sparse, secretKey,
      })

      await createCFSFiles({
        id, path, drive, key, sparse, secretKey,
      })

      debug('drive init: fs')
    }
  }

  async function createIdentifierFile() {
    if (id && drive.writable) {
      try {
        await pify(drive.access)(drive.CFSID)
      } catch (err) {
        await pify(drive.writeFile)(drive.CFSID, Buffer.from(id))
        debug('drive init: id', identifier)
      }
    } else {
      await onupdate()
    }
  }

  async function createPartition(name, storageOverride, opts) {
    if (false === tree.partitions.includes(name)) {
      throw new TypeError(`Invalid partition: ${name}`)
    }

    // just use opts as key pair
    const kp = opts || {}

    name = name.replace(/^\//, '')
    secretKey = drive.metadata.secretKey || drive.key

    if (!kp.key) {
      const prefix = Buffer.from(name)
      const seed = Buffer.concat([ prefix, secretKey ])
      Object.assign(kp, crypto.generateKeyPair(seed))
    }

    await partitions.create(name, {
      sparseMetadata: opts && opts.sparseMetadata ? true : sparseMetadata,
      sparse: opts && opts.sparse ? true : sparse,

      secretKey: kp.secretKey,
      storage: storageOverride || storage,
      key: kp.key || kp.publicKey,
    })
  }

  async function flushHistoryEvents(done) {
    if (eventStream && drive.writable) {
      const history = drive.history()
      const serialize = JSONStream()
      pumpcat(history, serialize, (err, buf) => {
        if (buf) {
          drive.writeFile(EVENT_LOG_FILE, buf, done)
        } else {
          done(err)
        }
      })
    } else {
      done(null)
    }
  }
}

function createRoot(drive) {
  return {
    [$PARTITION_NAME]: 'root',
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
}

function createPartitionManager(path, root, drive) {
  return Object.create({
    resolve(filename) {
      const partitions = this // eslint-disable-line no-shadow
      const resolved = drive.resolve(filename)

      debug('partitions: resolve: %s -> %s', filename, resolved)

      if ('/' === resolved) { return root }
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

      if (false === name in this) {
        Object.assign(opts, { path: resolve(path, name) })
        const partition = await createCFSDrive(opts)
        this[name] = partition
        this[name][$PARTITION_NAME] = name

        // wait for partition to be ready
        await new Promise((cb) => {
          partition.ready(cb)
        })

        // ensure partition has root access
        try {
          await pify(partition.access)('/')

          const { mtime, ctime } = await pify(partition.stat)('/')

          if (0 === Number(mtime) || 0 === Number(ctime)) {
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
}

async function ensureDriveRoot(drive) {
  // this ensures 'root' directory actually has a 'Stat' in
  // its metatdata
  if (drive.writable) {
    try {
      await pify(drive.access)('/')
      const { mtime, ctime } = await pify(drive.stat)('/')
      if (0 === Number(mtime) || 0 === Number(ctime)) {
        // just throw something to switch to `catch' context
        throw new Error()
      }
    } catch (err) {
      void err
      try {
        await pify(drive.mkdir)('/')
      } catch (error) {
        debug(error)
      }
    }
  }
}

/**
 * Politely ensure the root CFS directory has access, otherwise
 * create it.
 */
async function ensureCFSRootDirectoryAccess(opts) {
  const { fs = require('fs') } = opts
  debug('Ensuring root CFS directory "%s" has access', env.CFS_ROOT_DIR)
  try {
    await pify(fs.access)(env.CFS_ROOT_DIR)
  } catch (err) {
    // eslint-disable-next-line no-void
    void (err, await pify(mkdirp)(env.CFS_ROOT_DIR, { fs }))
  }
}

/**
 * This function creates the root CFS directories.
 * The directory structure is very similar to a
 * Linux filesystem, or FHS (Filesystem Hierarchy Standard).
 * @private
 */
async function createCFSDirectories({
  id, path, drive, key, sparse
}) {
  path = path || createCFSKeyPath({ id, key })
  drive = await (drive || createCFSDrive({ path, key, sparse }))

  debug(
    'Ensuring CFS directories for "%s" with key "%s"',
    path, drive.key.toString('hex')
  )

  for (const dir of tree.directories) {
    debug('Ensuring directory "%s" exists', dir)
    try {
      await pify(drive.stat)(dir)
    } catch (err) {
      await pify(drive.mkdirp)(dir)
    }
  }
}

async function createCFSFiles({
  id, path, drive, key, sparse, secretKey
}) {
  path = path || createCFSKeyPath({ id })
  drive = await (drive || createCFSDrive({ path, key, sparse }))
  debug(
    'Ensuring CFS files for "%s" with key "%s"',
    path, drive.key.toString('hex')
  )

  try {
    const signatureFile = drive.CFSSIGNATURE
    try {
      const signature = await pify(drive.readFile)(signatureFile)
      if (!signature || 0 === signature.length) {
        throw Error()
      }
    } catch (err) {
      const signature = crypto.sign(crypto.blake2b(Buffer.concat([
        drive.identifier, drive.key
      ])), secretKey)

      debug(
        'Writing CFS signature "%s" to %s',
        signature.toString('hex'),
        signatureFile
      )

      await pify(drive.writeFile)(signatureFile, signature)
    }
  } catch (err) {
    debug('Failed to create "/etc/cfs-signature" file:', err)
  }

  try {
    const epochFile = drive.CFSEPOCH
    try {
      await pify(drive.access)(epochFile)
    } catch (err) {
      // eslint-disable-next-line no-bitwise
      const timestamp = String((Date.now() / 1000) | 0)
      debug('Writing CFS epoch "%s" to %s', timestamp, epochFile)
      await pify(drive.writeFile)(epochFile, Buffer.from(timestamp))
    }
  } catch (err) {
    debug('Failed to create "/etc/cfs-epoch" file:', err)
  }

  try {
    const keyFile = drive.CFSKEY
    try {
      await pify(drive.access)(keyFile)
    } catch (err) {
      debug('Writing CFS key "%s" to %s', drive.key, keyFile)
      await pify(drive.writeFile)(keyFile, drive.key)
    }
  } catch (err) {
    debug('Failed to create "/etc/cfs-key" file:', err)
  }

  for (const file of tree.files) {
    debug('Ensuring file "%s"', file)
    try {
      await pify(drive.stat)(file) // eslint-disable-line no-await-in-loop
    } catch (err) {
      await pify(drive.touch)(file) // eslint-disable-line no-await-in-loop
    }
  }
}

module.exports = {
  createCFS,
}
