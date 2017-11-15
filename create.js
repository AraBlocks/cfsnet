'use strict'

const { createCFSKeyPath } = require('./create-key-path')
const { normalizeCFSKey } = require('./key')
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

const kLogEventTimeout = ms('10m')

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
async function createCFS({
  id = null,
  key = null,
  path = null,
  force = false,
  sparse = true,
  eventStream = true,
}) {
  await ensureCFSRootDirectoryAccess()

  key = normalizeCFSKey(key)
  path = path || createCFSKeyPath({id, key})


  if (drives[path]) {
    return drives[path]
  }

  debug("Creating CFS drive from identifier '%s' with key '%s'", id, key)
  const drive = await createCFSDrive({path, key, sparse})

  try {
    await pify(access)(path)
    debug("CFS already exists")
    if (true === force) {
      try {
        debug("Forcing recreation of CFS")
        await destroyCFS({id, path, key})
        return createCFS({id, path, key})
      } catch (err) {
        debug("Failed to recreate CFS with error %s",
          err.message || err.stack || err)
      }
    }
  } catch (err) { void err /** from fs.access() */ }

  // this needs to occur so a key can be generated
  debug("Ensuring CFS drive is ready")
  await new Promise((resolve) => drive.ready(resolve))

  if (id) {
    drive.identifier = id
    drive.HOME = `/home/${id}`
  } else {
    drive.identifier = null
    drive.HOME = `/root`
  }

  if (!key) {
    if (null == drives[path]) {
      debug("Initializing CFS event stream")
      await createCFSEventStream({path, drive, enabled: eventStream})
    }

    debug("Ensuring file system integrity" )
    await createCFSDirectories({id, path, drive, key, sparse})
    await createCFSFiles({id, path, drive, key, sparse})

    if (drive.identifier && drive.HOME) {
      await pify(drive.mkdirp)(drive.HOME)
    }

    await pify(drive.writeFile)('/etc/cfs-id', Buffer.from(String(id)))
    await drive.flushEvents()

    if (drives[path]) {
      await createCFSEventStream({path, drive, enabled: eventStream})
    }
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
async function createCFSDirectories({id, path, drive, key, sparse}) {
  path = path || createCFSKeyPath({id, key})
  drive = drive || drives[path] || await createCFSDrive({path, key, sparse})
  debug("Ensuring CFS directories for '%s' with key '%s'",
    path, drive.key.toString('hex'))
  for (const dir of tree.directories) {
    debug("Ensuring directory '%s'", dir)
    await pify(drive.mkdirp)(dir)
  }
}

async function createCFSFiles({id, path, drive, key, sparse}) {
  path = path || createCFSKeyPath({id})
  drive = drive || drives[path] || await createCFSDrive({path, key, sparse})
  debug("Ensuring CFS files for '%s' with key '%s'",
    path, drive.key.toString('hex'))
  for (const file of tree.files) {
    debug("Ensuring file '%s'", file)
    await pify(drive.touch)(file)
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
  const logs = String(await pify(drive.readFile)(log)).split('\n')
  let eventCount = 0
  let timeout = 0
  let logIndex = logs.length
  let logsSeen = 0
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
