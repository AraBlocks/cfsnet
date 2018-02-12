'use strict'

const { createCFSKeyPath } = require('./create-key-path')
const { normalizeCFSKey } = require('./key')
const { createCFS } = require('./create')
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
  maxConnections = 60,
  download = true,
  upload = true,
  live = true,
  dns = {},
  dht = {}
} = {}) {
  id = id ? id : cfs ? cfs.identifier : null
  key = key ? normalizeCFSKey(key) : cfs ? cfs.key.toString('hex') : null
  cfs = cfs || await createCFS({id, key})
  const swarm = discovery(cfs, {
    maxConnections,
    download,
    upload,
    live,

    dns: {
      ttl: dns.ttl || 30,
      limit: dns.limit || 100,
      loopback: null != dns.loopback ? dns.loopback : false,
      domain: dns.domain || 'Littlstar.local',
      server: dns.server || 'dns.us-east-1.littlstar.com',
    },

    dht: {
      maxTables: dht.maxTables || 10000,
      maxPeers: dht.maxPeers || 1000,
      bootstrap: dht.bootstrap || [
        {host: 'dht.us-east-1.littlstar.com', port: 6881},
      ],
    }
  })

  swarm.setMaxListeners(Infinity)
  return swarm
}

module.exports = {
  createCFSDiscoverySwarm
}
