'use strict'

const { createCFSKeyPath } = require('./create-key-path')
const { createCFSDrive } = require('./create-drive')
const { CFS_ROOT_DIR } = require('./env')
const { destroyCFS } = require('./destroy')
const { resolve } = require('path')
const { access } = require('fs')
const drives = require('./drives')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const debug = require('debug')('littlstar:cfs:create')
const tree = require('./tree')
const pify = require('pify')
const ms = require('ms')

const LOG_EVENT_TIMEOUT = ms('10m')

/**
 * Politely ensure the root CFS directory has access, otherwise
 * create it.
 */
async function ensureCFSRootDirectoryAccess() {
  debug("Ensuring root CFS directory '%s' has access", CFS_ROOT_DIR)
  try { await pify(access)(CFS_ROOT_DIR) }
  catch (err) { void (err, await pify(mkdirp)(CFS_ROOT_DIR)) }
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
async function createCFS({id, discoveryKey, force = false}) {
  const path = createCFSKeyPath({id, discoveryKey})
  let drive = null

  await ensureCFSRootDirectoryAccess()

  if (drives[path]) { drive = drives[path] }

  if (null == drive) {
    debug("Creating CFS drive from identifier '%s' with discoveryKey '%s'",
      id, discoveryKey)
    drive = await createCFSDrive({path, discoveryKey})
  }

  try {
    await pify(access)(path)
    debug("CFS already exists")
    if (true === force) {
      try {
        debug("Forcing recreation of CFS")
        await destroyCFS({id, discoveryKey})
        return createCFS({id, discoveryKey})
      } catch (err) {
        debug("Failed to recreate CFS with error %s",
          err.message || err.stack || err)
      }
    }
  } catch (err) { void err /** from fs.access() */ }

  debug("Ensuring CFS drive is ready")
  // this needs to occur so a key can be generated
  await new Promise((resolve) => drive.ready(resolve))
  if (null == drives[path]) {
    await createCFSEventStream({drive})
  }

  await createCFSDirectories({id, drive, discoveryKey})
  await createCFSFiles({id, drive, discoveryKey})
  await drive.flushEvents()
  if (drives[path]) {
    await createCFSEventStream({drive})
  }

  debug("Caching CFS drive in CFSMAP")
  drives[path] = drive

  return drive
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
async function createCFSDirectories({id, drive, discoveryKey}) {
  const path = createCFSKeyPath({id, discoveryKey})
  drive = drive || drives[path] || await createCFSDrive({path, discoveryKey})
  debug("Creating CFS directories for '%s' with discoveryKey '%s'",
    path,
    (drive.discoveryKey || drive.key).toString('hex'))
  for (const dir of tree.directories) {
    try { await drive.access(dir) }
    catch(err) {
      debug("Creating directory '%s'", dir)
      await drive.mkdir(dir)
    }
  }
}

async function createCFSFiles({id, drive, discoveryKey}) {
  const path = createCFSKeyPath({id})
  drive = drive || drives[path] || await createCFSDrive({path, discoveryKey})
  debug("Creating CFS files for '%s' with discoveryKey '%s'",
    path,
    (drive.discoveryKey || drive.key).toString('hex'))
  for (const file of tree.files) {
    try { await drive.access(file) }
    catch (err) {
      debug("Creating file '%s'", file)
      await drive.touch(file)
    }
  }
}

async function createCFSEventStream({drive}) {
  if (drive.hasEventStream) { return }
  const log = '/var/log/events'
  try { await drive.access(log) }
  catch ({}) { await drive.touch(log) }
  const timestamp = () => Math.floor(Date.now()/1000) // unix timestamp (seconds)
  const logs = String(await drive.readFile(log)).split('\n')
  let eventCount = 0
  let timeout = setTimeout(flushEvents, LOG_EVENT_TIMEOUT)
  let logIndex = logs.length
  let logsSeen = 0
  drive.history({live: true}).on('data', async (event) => {
    if (log == event.name) { return }
    if (logsSeen++ < logIndex) { return }
    Object.assign(event, {timestamp: timestamp()})
    const entry = JSON.stringify(event)
    debug("event:", entry)
    logs.push(entry)
    if (++eventCount > 10) { await flushEvents() }
  })
  drive.hasEventStream = true
  drive.flushEvents = flushEvents
  process.once('exit', async () => await flushEvents())
  setTimeout(flushEvents, 0)
  async function flushEvents() {
    clearTimeout(timeout)
    timeout = setTimeout(flushEvents, LOG_EVENT_TIMEOUT)
    if (0 == eventCount) { return }
    logs.push(JSON.stringify({type: "flush", timestamp: timestamp()}))
    debug("Flushing logs to '%s'", log)
    await drive.writeFile(log, logs.join('\n'))
    eventCount = 0
  }
}

module.exports = {
  createCFSDirectories,
  createCFSFiles,
  createCFS,
}
