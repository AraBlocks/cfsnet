'use strict'

const { CFS_ROOT_DIR } = require('./env')
const debug = require('debug')('littlstar:cfs:drive:map')

/**
 * This shared object maps a CFS key path to an instance
 * of a CFS HyperDrive object. Instances are set on this
 * object by the `createCFS` function and removed by the
 * `destroyCFS` function.
 */
debug("Initializing `CFSMAP` drive map")
const CFSMAP = Object.create(null)
module.exports = Object.create(null, {
  CFSMAP: {get: () => CFSMAP}
})
