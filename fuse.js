/* eslint-disable no-bitwise */
const { resolve, join } = require('path')
const randombytes = require('randombytes')
const collect = require('collect-stream')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const TMPDIR = require('temp-dir')
const onExit = require('async-exit-hook')
const debug = require('debug')('cfsnet:fuse')
const pump = require('pump')
const pify = require('pify')
const raf = require('random-access-file')
const ras = require('random-access-stream')
const fs = require('fs')

let fuse = null
try {
  // eslint-disable-next-line
  fuse = require('fuse-bindings')
} catch (err) {
  debug(err)
}

// from http://man7.org/linux/man-pages/man2/statfs.2.html
const FUSE_SUPER_MAGIC = 0x65735546

// from: https://code.woboq.org/gcc/include/bits/statvfs.h.html
const ST_NODIRATIME = 0x0800
const ST_NOATIME = 0x0400
const ST_NOEXEC = 0x0008
const ST_RDONLY = 0x0001

function stringFromFlags(flags) {
  flags &= 3
  if (0 === flags) { return 'r' }
  if (1 === flags) { return 'w' }
  return 'r+'
}

function errcode(err) {
  return err && err.code ? fuse.errno(err.code) : err
}

async function stat(cfs, path) {
  const st = await cfs.stat(path)

  if ('/' !== path) {
    // ./ ..//
    st.nlink = 2
  }

  try {
    if (st.isDirectory()) {
      const entries = await cfs.readdir(path)
      const paths = entries.map(e => resolve(path, e))
      const stats = await Promise.all(paths.map(p => cfs.stat(p)))
      const dirs = stats.filter(st => st.isDirectory())
      st.nlink += dirs.length
    }
  } catch (err) {
    debug('stat: %s: error: %s', path, err)
  }

  if (st.isFile()) {
    st.mode = fs.constants.S_IFREG
    if (cfs.writable) {
      st.mode |= 0o744
    } else {
      st.mode |= 0o444
    }
  } else {
    st.mode = fs.constants.S_IFDIR
    if (cfs.writable) {
      st.mode |= 0o755
    } else {
      st.mode |= 0o744
    }
  }

  return Object.assign(st, {
    gid: process.getgid(),
    uid: process.getuid(),
    size: st.size || 4 * 1024,
  })
}

async function defaultTemporaryStorage(path, cfs) {
  const prefix = randombytes(16).slice(0, 8).toString('hex')
  const dirname = await pify(mkdirp)(join(TMPDIR, prefix))
  return filename => Object.assign(raf(join(dirname, filename)), { dirname })
}

async function mount(path, cfs, opts) {
  if (!fuse) {
    throw new TypeError(`Cannot mount: ${path}: 'fuse-bindings' not loaded`)
  }

  if (!opts || 'object' !== typeof opts) {
    opts = {}
  }

  const {
    force = true,
    displayFolder = false,
  } = opts

  const tmp = { }
  const createTmpStorage = 'function' === typeof opts.tmpStorage
    ? opts.tmpStorage
    : defaultTemporaryStorage

  const tmpStorage = await createTmpStorage(path, cfs)

  const xattr = opts.xattr || new Map()

  const D = (fmt, ...args) => debug(
    `mount: %s -> %s: ${fmt}`,
    path,
    cfs.identifier,
    ...args
  )

  D('Mounting...')

  const options = [
    'default_permissions',
  ].concat(opts.options).filter(Boolean)

  if (true === opts.umask) {
    options.push(`umask=${process.umask()}`)
  }

  if (
    opts.umask &&
    ('number' === typeof opts.umask || 'string' === typeof opts.umask)
  ) {
    options.push(`umask=${opts.umask}`)
  }

  if ('darwin' === process.platform) {
    options.push('allow_other')
  }

  await pify(fuse.mount)(path, {
    displayFolder,
    options,
    force,

    // fs ops
    access,
    chown,
    chmod,
    create,
    fgetattr,
    flush,
    fsync,
    fsyncdir,
    ftruncate,
    getattr,
    mkdir,
    mknod,
    open,
    opendir,
    read,
    readdir,
    readlink,
    release,
    releasedir,
    rename,
    rmdir,
    truncate,
    unlink,
    utimens,
    write,
    setxattr,
    getxattr,
    listxattr,
    removexattr,
    statfs,
  })

  onExit((done) => {
    D('onexit: %s', path)
    fuse.unmount(path, done)
  })

  return { unmount, xattr }

  async function unmount() {
    await pify(fuse.unmount)(path)
  }

  async function access(path, mode, done) {
    D('access: %s (%s)', path, mode)
    try {
      await cfs.access(path, 0)
      done()
    } catch (err) {
      D('access: %s: error:', path, err.message)
      return done(fuse.ENOENT)
    }
  }

  async function chown(path, uid, gid, done) {
    D('chown: %s (%s)', path, uid, gid)
    done()
  }

  async function chmod(path, mode, done) {
    D('chown: %s (%s)', path, mode)
    done()
  }

  async function mknod(path, mode, dev, done) {
    D('mknod: %s (%s)', path, mode, dev)
    done()
  }

  async function create(path, mode, done) {
    D('create: %s (%s)', path, mode)

    if (false === cfs.writable) {
      return done(fuse.EPERM)
    }

    try {
      await cfs.touch(path)
      const fd = await cfs.open(path, 'r+', mode)
      done(0, fd)
    } catch (err) {
      D('create: %s: error:', path, err.message)
      return done(fuse.ENOENT)
    }
  }

  async function fgetattr(path, fd, done) {
    D('fgetattr: %s', path)
    // check path access first
    try {
      await cfs.access(path)
    } catch (err) {
      D('fgetattr: %s: error:', path, err.message)
      return done(fuse.ENOENT)
    }

    try {
      // collect stats
      const stats = await stat(cfs, path)
      done(0, stats)
    } catch (err) {
      D('fgetattr: %s: error:', path, err.message)
      return done(fuse.ENOENT)
    }
  }

  async function flush(path, fd, done) {
    D('flush: %s (%s)', path, fd)

    if (path in tmp) {
      try {
        const stream = ras(tmp[path])
        pump(stream, cfs.createWriteStream(path))
        await new Promise((resolve, reject) => {
          stream.on('error', reject)
          stream.on('end', resolve)
        })

        await pify(rimraf)(tmp[path].dirname)
        delete tmp[path]
      } catch (err) {
        D('flush: %s: error:', path, err.message)
        return done(fuse.EAGAIN)
      }
    }

    done()
  }

  async function fsync(path, fd, datasync, done) {
    D('fsync: %s (%s)', path, fd, datasync)
    done()
  }

  async function fsyncdir(path, fd, datasync, done) {
    D('fsyncdir: %s (%s)', path, fd, datasync)
    done()
  }

  async function ftruncate(path, fd, size, done) {
    D('truncate: %s size=%s', path, size)

    if (false === cfs.writable) {
      return done(fuse.EPERM)
    }

    if (0 === size) {
      try {
        await cfs.writeFile(path, Buffer.alloc(0))
      } catch (err) {
        D('truncate: %s: error:', path, err.message)
        return done(fuse.EAGAIN)
      }
    } else {
      const buf = Buffer.alloc(size)
      const nread = await cfs.read(fd, buf, 0, 4, 0)
      await cfs.writeFile(path, buf)
    }

    try {
      // collect stats
      const stats = await stat(cfs, path)
      done(0, stats)
    } catch (err) {
      D('ftruncate: %s: error:', path, err.message)
      return done(fuse.ENOENT)
    }
  }

  async function getattr(path, done) {
    D('getattr: %s', path)
    // check path access first
    try {
      await cfs.access(path)
    } catch (err) {
      D('getattr: %s: error:', path, err.message)
      return done(fuse.ENOENT)
    }

    try {
      // collect stats
      const stats = await stat(cfs, path)
      done(0, stats)
    } catch (err) {
      D('getattr: %s: error:', path, err.message)
      return done(fuse.ENOENT)
    }
  }

  async function mkdir(path, mode, done) {
    D('mkdir: %s (%s)', path, mode)

    if (false === cfs.writable) {
      return done(fuse.EPERM)
    }

    try {
      await cfs.mkdir(path)
      done(0)
    } catch (err) {
      D('mkdir: %s: error:', path, err.message)
      return done(fuse.ENOENT)
    }
  }

  async function open(path, flags, done) {
    D('open: %s (%s [%s])', path, flags, stringFromFlags(flags))

    // check path access first
    try {
      await cfs.access(path)
    } catch (err) {
      D('open: %s: error:', path, err.message)
      return done(fuse.ENOENT)
    }

    try {
      const fd = await cfs.open(path, stringFromFlags(flags))
      done(0, fd)
    } catch (err) {
      D('open: %s: error:', path, err.message)
      return done(fuse.ENOENT)
    }
  }

  async function opendir(path, flags, done) {
    D('opendir: %s (%s [%s])', path, flags, stringFromFlags(flags))
    done()
  }

  async function read(path, fd, buffer, length, position, done) {
    D('read: %s (%s) len=%s pos=%s', path, fd, length, position)

    if (path in tmp) {
      tmp[path].read(position, length, (err, buf) => {
        if (err) {
          D('read: %s: error:', path, err.message)
          done(fuse.EAGAIN)
        } else {
          done(0, buf.length)
        }
      })
    } else {
      try {
        const out = await pify(collect)(cfs.createReadStream(path, {
          start: position, length
        }))
        if (Buffer.isBuffer(out)) {
          out.copy(buffer)

          done(out.length)
        } else {
          done(0)
        }
      } catch (err) {
        D('read: %s: error:', path, err.message)
        done(fuse.EAGAIN)
      }
    }
  }

  async function readdir(path, done) {
    D('readdir: %s', path)

    // check path access first
    try {
      await cfs.access(path)
    } catch (err) {
      D('readdir: %s: error:', path, err.message)
      return done(fuse.ENOENT)
    }

    // check if path is directory
    const stats = await stat(cfs, path)
    if (false === stats.isDirectory()) {
      return done(fuse.ENOTDIR)
    }

    // read directory entries
    try {
      const entries = await cfs.readdir(path)
      D('readdir: %s: entries=%s', path, entries)
      done(0, entries)
    } catch (err) {
      D('readdir: %s: error:', path, err.message)
      return done(fuse.EAGAIN)
    }
  }

  async function readlink(path, done) {
    D('readlink: %s', path)
    done(null, cfs.resolve(path))
  }

  async function release(path, fd, done) {
    D('release: %s (%s)', path, fd)

    try {
      await cfs.close(fd)
      done()
    } catch (err) {
      D('release: %s: error:', path, err.message)
      return done(fuse.EAGAIN)
    }
  }

  async function releasedir(path, fd, done) {
    D('releasedir: %s (%s)', path, fd)
    done()
  }

  async function rename(src, dst, done) {
    D('rename: %s -> %s', src, dst)

    if (false === cfs.writable) {
      return done(fuse.EPERM)
    }

    // check path access first
    try {
      await cfs.access(src)
    } catch (err) {
      D('rename: %s: error:', path, err.message)
      return done(fuse.ENOENT)
    }

    // check path access first
    try {
      await cfs.access(dst)
    } catch (err) {
      void err
    }

    try {
      pump(cfs.createReadStream(src), cfs.createWriteStream(dst), onpump)
    } catch (err) {
      D('rename: %s: error:', path, err.message)
      return done(fuse.ENOENT)
    }

    async function onpump(err) {
      if (err) {
        D('rename: %s: error:', path, err.message)
        return done(fuse.EAGAIN)
      }

      try {
        await cfs.unlink(src)
        done()
      } catch (err) {
        D('rename: %s: error:', path, err.message)
        return done(fuse.EAGAIN)
      }
    }
  }

  async function rmdir(path, done) {
    D('rmdir: %s', path)

    if (false === cfs.writable) {
      return done(fuse.EPERM)
    }

    // check path access first
    try {
      await cfs.access(path)
    } catch (err) {
      D('rmdir: %s: error:', path, err.message)
      return done(fuse.ENOENT)
    }

    // check if path is directory
    const stats = await stat(cfs, path)
    if (false === stats.isDirectory()) {
      return done(fuse.ENOTDIR)
    }

    try {
      await cfs.rmdir(path)
      done()
    } catch (err) {
      D('rmdir: %s: error:', path, err.message)
      return done(fuse.EAGAIN)
    }
  }

  async function setxattr(path, name, buf, len, offset, flags, done) {
    D('setxattr: %s name=%s flags=%d', path, name, flags)
    const val = buf.slice(offset, offset + len)

    const map = xattr.get(path) || new Map()
    map.set(name, val)

    xattr.set(path, map)
    done(0)
  }

  async function getxattr(path, name, buf, len, offset, done) {
    D('getxattr: %s name=%s', path, name)
    const map = xattr.get(path)
    if (map) {
      const val = map.get(name)

      if (Buffer.isBuffer(val)) {
        val.copy(buf, offset)
        return done(val.length)
      }
    }
    done(0)
  }

  async function listxattr(path, buf, len, done) {
    D('listxattr: %s', path)
    const map = xattr.get(path)

    if (map) {
      const buffers = Buffer.concat(map.entries().map(e => e[1]))
      buffers.copy(buf, 0, 0, len)
      return done(buffers.length)
    }

    done(0)
  }

  async function removexattr(path, name, done) {
    D('removexattr: %s name=%s', path, name)
    const map = xattr.get(path)
    map.delete(name)

    done()
  }

  async function statfs(path, done) {
    D('statfs: %s', path)

    let nblocks = 0
    let nfiles = 0
    let flags = 0

    for (const k in cfs.partitions) {
      const { content } = cfs.partitions[k]
      if (content && 'object' === typeof content) {
        nblocks += cfs.partitions[k].content.length
      }
    }

    if (false === cfs.writable) {
      flags |= ST_RDONLY
      flags |= ST_NOEXEC
    }

    flags |= ST_NODIRATIME
    flags |= ST_NOATIME

    await pify(walk)('/')

    return done(0, {
      ftype: FUSE_SUPER_MAGIC,
      bsize: 64 * 1024,
      frsize: 64 * 1024,
      blocks: nblocks,
      bfree: cfs.writable ? 1000000 : 0,
      bavail: cfs.writable ? 1000000 : 0,
      files: nfiles,
      ffree: cfs.readable ? 0 : 1000000,
      favail: 1024 * 1024,
      fsid: parseInt(cfs.identifier.toString('hex'), 16),
      flag: flags,

      namelen: 1024 * 1024,
      namemax: 1024 * 1024,
    })

    function walk(dir, cb) {
      cfs.readdir(dir, onreaddir)
      function onreaddir(err, entries) {
        if (err) {
          return cb(err)
        }

        let pending = 0
        const mix = path => (err, st) => {
          onstat(err, Object.assign(st, { path }))
          if (0 === --pending) cb()
        }
        for (const k of entries) {
          const path = join(dir, k)
          pending++
          cfs.stat(path, mix(path))
        }
      }

      function onstat(err, stat) {
        if (err) {
          return cb(err)
        } else if (stat.isFile()) {
          nfiles++
        } else if (stat.isDirectory()) {
          walk(stat.path, cb)
        }
      }
    }
  }

  async function truncate(path, size, done) {
    D('truncate: %s size=%s', path, size)

    if (false === cfs.writable) {
      return done(fuse.EPERM)
    }

    if (0 === size) {
      try {
        await cfs.writeFile(path, Buffer.alloc(0))
      } catch (err) {
        D('truncate: %s: error:', path, err.message)
        return done(fuse.EAGAIN)
      }
    } else {
      const buf = await pify(collect)(cfs.createReadStream({ end: size }))
      await cfs.writeFile(path, buf)
    }

    try {
      // collect stats
      const stats = await stat(cfs, path)
      done(0, stats)
    } catch (err) {
      D('truncate: %s: error:', path, err.message)
      return done(fuse.ENOENT)
    }
  }

  async function unlink(path, done) {
    D('unlink: %s', path)

    if (false === cfs.writable) {
      return done(fuse.EPERM)
    }

    // check path access first
    try {
      await cfs.access(path)
    } catch (err) {
      D('unlink: %s: error:', path, err.message)
      return done(fuse.ENOENT)
    }

    try {
      await cfs.unlink(path)
      done()
    } catch (err) {
      D('unlink: %s: error:', path, err.message)
      return done(fuse.EAGAIN)
    }
  }

  async function utimens(path, atime, mtime, done) {
    D('utimens: %s (%s)', path, atime, mtime)

    if (false === cfs.writable) {
      return done(fuse.EPERM)
    }

    // check path access first
    try {
      await cfs.access(path)
      done()
    } catch (err) {
      D('unlink: %s: error:', path, err.message)
      return done(fuse.ENOENT)
    }
  }

  async function write(path, fd, buffer, length, position, done) {
    D('write: %s (%s) len=%s pos=%s', path, fd, length, position)

    if (false === cfs.writable) {
      return done(fuse.EPERM)
    }

    if (!tmp[path]) {
      tmp[path] = tmpStorage(path)
      const buf = await pify(collect)(cfs.createReadStream(path))

      if (Buffer.isBuffer(buf)) {
        await new Promise(resolve => tmp[path].write(0, buf, resolve))
      }
    }

    tmp[path].write(position, buffer.slice(0, length), (err) => {
      if (err) {
        D('write: %s: error:', path, err.message)
        done(fuse.EAGAIN)
      } else {
        done(length)
      }
    })
  }
}

module.exports = {
  mount
}
