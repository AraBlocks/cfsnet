'use strict'

const { createCFSKeyPath } = require('./create-key-path')
const { normalizeCFSKey } = require('./key')
const discovery = require('hyperdiscovery')
const drives = require('./drives')
const debug = require('debug')('littlstar:cfs:swarm')

/**
 * Creates a CFS discovery network swarm
 *
 * @public
 * @param {?(Object)} opts
 * @param {?(Object)} opts.cfs
 * @param {?(Object)} opts.key
 * @param {?(Object)} opts.id
 * @param {?(Object)} opts.download
 * @param {?(Object)} opts.upload
 * @param {?(Object)} opts.dht
 * @param {?(Object)} opts.dns
 * @return {HyperDiscovery}
 */
async function createCFSDiscoverySwarm({
  cfs = null,
  key = null,
  id = null,
  download = true,
  upload = true,
  dns = {},
  dht = {}
} = {}) {
  key = normalizeCFSKey(key)
  cfs = cfs || await createCFS({id, key})
  const swarm = discovery(cfs, {
    upload, download,
    dns: {
      domain: dns.domain || 'Littlstar.local',
      server: dns.server || 'dns.us-east-1.littlstar.com',
    },
    dht: {
      bootstrap: dht.bootstrap || [
        {host: 'dht.us-east-1.littlstar.com', port: 6881},
        {host: 'localhost', port: 6881}
      ],
    }
  })
  swarm.setMaxListeners(Infinity)
  return swarm
}

module.exports = {
  createCFSDiscoverySwarm
}
