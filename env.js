'use strict'

const { resolve, join } = require('path')
const debug = require('debug')('littlstar:cfs:env')

/**
 * The root CFS ID that is usually the Littlstar user id.
 */
const CFS_ROOT_ID = process.env.CFS_ROOT_ID
  || 'ea60d365bef27b80a2f2fc019c3c1eaa0a38682d8e361ce935ad9a0f' // littlstar user (10) apikey

/**
 * The root CFS directory path on the machine's filesystem.
 */
const CFS_ROOT_DIR = process.env.CFS_ROOT_DIR || resolve('.cfs')

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
