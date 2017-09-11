'use strict'

const { CFS_ROOT_ID } = require('./env')
const { createCFS } = require('./create')
const debug = require('debug')('littlstar:cfs:create:lcfs')

/**
 * This function creates the root CFS file system in which upstream files
 * can be published to before being propagated to any authorized CFS.
 */
async function createLCFS({key, force = false}) {
  debug("Creating LCFS with key '%s'", key)
  return createCFS({id: CFS_ROOT_ID, key, force})
}

module.exports = {
  createLCFS
}
