'use strict'

const { createCFSKeyPath } = require('./key-path')
const { normalizeCFSKey } = require('./key')
const { createCFSDrive } = require('./drive')
const { CFS_ROOT_DIR } = require('./env')
const { destroyCFS } = require('./destroy')
const { resolve } = require('path')
const isBrowser = require('is-browser')
const drives = require('./drives')
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
 * CFS storage ID. If `.force` is set to true, then the CFS will be
 * created regardless destroying an existing one in the process.
 *
 * The "public key" is exposed on the HyperDrive instance as the property
 * `.key`. An optional "discovery public key" can be given for replication
 */
async function createCFS({
  fs = require('fs'),
  id = null,
  key = null,
  path = null,
  force = false,
  latest = true,
  sparse = true,
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

  const idFile = '/etc/cfs-id'

  if (drives[path]) {
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

  drive.HOME = null

  try {
    await pify(fs.access)(path)
    drives[path] = drive
  } catch (err) {  }

  const close = drive.close.bind(drive)
  drive.close = (...args) => {
    delete drives[path]
    return close(...args)
  }

  if (id) {
    drive.HOME = `/home/${id}`
  }

  if (drive.writable) {
    drive.identifier = id

    await initSystem()
    await initId()
    await initHome()

    if ('function' == typeof drive.flushEvents) {
      debug("Flushing events")
      await drive.flushEvents()
    }

    if (eventStream) {
      await createCFSEventStream({path, drive, enabled: eventStream})
    }
  }

  debug("Caching CFS drive in CFSMAP")

  return drive

  async function initSystem() {
    debug("initSystem()")
    debug("Ensuring file system integrity" )
    await createCFSDirectories({id, path, drive, key, sparse})
    await createCFSFiles({id, path, drive, key, sparse})
  }

  async function initId() {
    if (id && drive.writable) {
      try { await pify(drive.stat)(idFile) }
      catch (err) { await pify(drive.writeFile)(idFile, Buffer.from(id)) }
    }
  }

  async function initHome() {
    if (drive.identifier && drive.writable) {
      debug("initHome()")
      drive.HOME = `/home/${drive.identifier}`
      try { await pify(drive.stat)(drive.HOME) }
      catch (err) { await pify(drive.mkdirp)(drive.HOME) }
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
  for (const file of tree.files) {
    debug("Ensuring file '%s'", file)
    try { await pify(drive.stat)(file) }
    catch (err) { await pify(drive.touch)(file) }
  }

  const epochFile = '/etc/cfs-epoch'
  const epoch = await pify(drive.readFile)(epochFile, 'utf8')
  if (!epoch || !epoch.length) {
    const timestamp = String((Date.now()/1000)|0)
    debug("Writing CFS epoch '%s' to %s", timestamp, epochFile)
    await pify(drive.writeFile)(epochFile, Buffer.from(timestamp))
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
