'use strict'

const { createCFSKeyPath } = require('./key-path')
const { normalizeCFSKey } = require('./key')
const through = require('through')
const drives = require('./drives')
const debug = require('debug')('cfsnet:log')

async function createCFSLog({
  id = null,
  cfs = null,
  key = null,
  name = 'events',
  flushInterval = 10000,
} = {}) {
  key = key ? normalizeCFSKey(key) : cfs ? cfs.key.toString('hex') : null
  id = id ? id : cfs ? cfs.identifier : null

  const log = `/var/log/${name}`
  const path = createCFSKeyPath({id, key})

  let stream = through(onwrite)
  let timeout = null
  let writer = null

  cfs = cfs || drives[path] || null

  if (cfs) {
    stream = through(onwrite)
    stream.setMaxListeners(Infinity)
    debug("Initializing CFS log writer '%s' for '%s' with flush interval %dms",
      log,
      path,
      flushInterval)
    timeout = setTimeout(flush, flushInterval)
    setTimeout(flush, 0)
    initWriter()
  }

  return writer

  function initWriter() {
    writer = cfs.createWriteStream(log)
    stream.pipe(writer)
  }

  function onwrite(chunk) {
    if (null != chunk) {
      this.push(chunk)
    }
  }

  function flush() {
    clearTimeout(timeout)
    timeout = setTimeout(flush, flushInterval)
    debug("Flushing CFS log '%s' for '%s'", log, path)
    writer.end()
    initWriter()
  }
}

module.exports = {
  createCFSLog
}
