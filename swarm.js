'use strict'

const { createCFSKeyPath } = require('./create-key-path')
const { normalizeCFSKey } = require('./key')
const discovery = require('hyperdiscovery')
const drives = require('./drives')
const debug = require('debug')('littlstar:cfs:swarm')

/**
 * Creates a CFS discovery network swarm
 */
async function createCFSDiscoverySwarm({cfs, id, key, dns = {}, dht = {}}) {
  key = normalizeCFSKey(key)
  cfs = cfs || await createCFS({id, key})
  id = id || cfs.id
  const swarm = discovery(cfs, {
    dns: {
      domain: dns.domain || 'Littlstar.local',
      server: dns.server || 'dns-service.us-east-1.littlstar.com',
    },
    dht: {
      bootstrap: dht.bootstrap || [
        {host: 'dht-service.us-east-1.littlstar.com', port: 6881},
        {host: 'localhost', port: 6881}
      ],
    }
  })
  return swarm
}

module.exports = {
  createCFSDiscoverySwarm
}
