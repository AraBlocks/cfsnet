'use strict'

const { createCFSKeyPath } = require('./create-key-path')
const through = require('through')
const drives = require('./drives')
const debug = require('debug')('littlstar:cfs:log')

async function createCFSLog({
  id,
  cfs,
  name = 'events',
  discoveryKey,
  flushInterval = 10000,
} = {}) {
  const log =`/var/log/${name}`
  const path = createCFSKeyPath({id, discoveryKey})
  const stream = through(onwrite)
  let writer = null
  let timeout = null
  cfs = cfs || drives[path] || null
  if (cfs) {
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
