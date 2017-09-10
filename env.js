'use strict'

const { resolve } = require('path')
const debug = require('debug')('littlstar:cfs:env')

/**
 * The root CFS ID that is usually the Littlstar user id.
 */
const CFS_ROOT_ID = process.env.CFS_ROOT_ID || 0x000A // littlstar user ID (10)

/**
 * The root CFS directory path on the machine's filesystem.
 */
const CFS_ROOT_DIR = process.env.CFS_ROOT_DIR || resolve('./cfs')

/**
 * An optional discovery key for replication.
 */
const CFS_DISCOVERY_KEY = process.env.CFS_DISCOVERY_KEY || undefined

debug(`
        CFS_ROOT_ID: ${CFS_ROOT_ID}
       CFS_ROOT_DIR: ${CFS_ROOT_DIR}
  CFS_DISCOVERY_KEY: ${CFS_DISCOVERY_KEY}
`)

module.exports = {
  CFS_DISCOVERY_KEY,
  CFS_ROOT_DIR,
  CFS_ROOT_ID,
}
