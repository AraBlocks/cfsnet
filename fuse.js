/* eslint-disable no-bitwise */
const collect = require('collect-stream')
const debug = require('debug')('cfsnet:fuse')
const fuse = require('fuse-bindings')
const pify = require('pify')

function stringFromFlags(flags) {
  flags &= 3
  if (0 === flags) { return 'r' }
  if (1 === flags) { return 'w' }
  return 'r+'
}

async function mount(path, cfs, opts) {
  if (!opts || 'object' !== typeof opts) {
    opts = {}
  }

  const {
    force = true,
    displayFolder = false,
  } = opts

  const D = (fmt, ...args) => debug(
    `mount: %s -> %s: ${fmt}`,
    path,
    cfs.identifier,
    ...args
  )

  D('Mounting...')

  await pify(fuse.mount)(path, {
    displayFolder,
    force,

    // fs ops
    access,
    getattr,
    readdir,
    open,
    read,
    write,
    create,
    unlink,
    mkdir,
    rmdir,
  })

  async function access(path, mode, done) {
    D('access: %s (%s)', path, mode)
    try {
      await cfs.access(path, mode)
      done(null)
    } catch (err) {
      D('access: %s: error:', path, err.message)
      done(err)
    }
  }

  async function statfs(path, done) {
    D('statfs: %s', path)
    done(0)
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
      const stats = await cfs.stat(path)
      done(0, stats)
    } catch (err) {
      D('getattr: %s: error:', path, err.message)
      return done(fuse.ENOENT)
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
    const stats = await cfs.stat(path)
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
      done(err)
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

  async function read(path, fd, buffer, length, position, done) {
    D('read: %s (%s) len=%s pos=%s', path, fd, length, position)

    try {
      const nread = await cfs.read(fd, buffer, 0, length, position)
      done(nread)
    } catch (err) {
      D('read: %s: error:', path, err.message)
      done(fuse.EAGAIN)
    }
  }

  async function write(path, fd, buffer, length, position, done) {
    D('write: %s (%s) len=%s pos=%s', path, fd, length, position)

    if (false === cfs.writable) {
      return done(fuse.EPERM)
    }

    try {
      const stat = await cfs.stat(path)
      const out = Buffer.alloc((length - 1) + (stat.size - position))
      const buf = await pify(collect)(cfs.createReadStream(path))

      buf.copy(out, 0)
      buffer.copy(out, position, 0, length)
      await cfs.writeFile(path, out)
      done(length)
    } catch (err) {
      D('write: %s: error:', path, err.message)
      done(fuse.EAGAIN)
    }
  }

  async function release(path, fd, done) {
    D('release: %s (%s)', path, fd)
    try {
      await cfs.close(fd)
    } catch (err) {
      D('release: %s: error:', path, err.message)
      done(fuse.EAGAIN)
    }
  }

  async function create(path, mode, done) {
    D('create: %s (%s)', path, mode)

    if (false === cfs.writable) {
      return done(fuse.EPERM)
    }

    try {
      await cfs.touch(path)
      const fd = await cfs.open(path, 'w+', mode)
      done(0, fd)
    } catch (err) {
      D('create: %s: error:', path, err.message)
      return done(fuse.ENOENT)
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
    } catch (err) {
      D('unlink: %s: error:', path, err.message)
      return done(fuse.ENOENT)
    }

    done()
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
    } catch (err) {
      D('unlink: %s: error:', path, err.message)
      done(fuse.EAGAIN)
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
    const stats = await cfs.stat(path)
    if (false === stats.isDirectory()) {
      return done(fuse.ENOTDIR)
    }

    try {
      await cfs.rmdir(path)
    } catch (err) {
      D('rmdir: %s: error:', path, err.message)
      done(fuse.EAGAIN)
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
}

module.exports = {
  mount
}
