'use strict'

const { CFS_ROOT_ID } = require('./env')
const { createCFS } = require('./create')
const debug = require('debug')('littlstar:cfs:create:lcfs')

/**
 * This function creates the root CFS file system in which upstream files
 * can be published to before being propagated to any authorized CFS.
 */
async function createLCFS({discoveryKey, force = false}) {
  debug("Creating LCFS with discoveryKey '%s'", discoveryKey)
  return createCFS({id: CFS_ROOT_ID, discoveryKey, force})
}

module.exports = {
  createLCFS
}
