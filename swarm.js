'use strict'

const { createCFSKeyPath } = require('./create-key-path')
const discovery = require('hyperdiscovery')
const drives = require('./drives')
const debug = require('debug')('littlstar:cfs:swarm')

/**
 */
async function createCFSDiscoverySwarm({cfs, id, key}) {
  cfs = cfs || await createCFS({id, key})
  id = id || cfs.id
  const swarm = discovery(cfs, {
    dns: {domain: 'cfs.local'}
  })
  swarm.on('connection', (peer, info) => {
    console.log('peer', info);
  })
  return swarm
}

module.exports = {
  createCFSDiscoverySwarm
}
