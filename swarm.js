'use strict'

const { createCFSSignalHub } = require('./signalhub')
const { createCFSKeyPath } = require('./key-path')
const { normalizeCFSKey } = require('./key')
const createWebRTCSwarm = require('webrtc-swarm')
const { createSHA256 } = require('./sha256')
const { createCFS } = require('./create')
const isBrowser = require('is-browser')
const discovery = require('discovery-swarm')
const drives = require('./drives')
const WebRTC = require('wrtc')
const crypto = require('./crypto')
const debug = require('debug')('littlstar:cfs:swarm')
const pump = require('pump')

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
  signalhub = null,
  download = true,
  upload = true,
  live = true,
  wrtc = null,
  port = 0,
  dns = {},
  dht = {}
} = {}) {
  let swarm = null
  id = id ? id : cfs ? cfs.identifier : null
  key = key ? normalizeCFSKey(key) : cfs ? cfs.key.toString('hex') : null
  cfs = cfs || await createCFS({id, key})

  const discoveryKey = cfs.discoveryKey || crypto.discoveryKey(Buffer.from(cfs.key || key))

  if (false == isBrowser) {
    swarm = discovery({
      maxConnections, stream, hash: false,

      dns: {
        ttl: dns.ttl || 30,
        limit: dns.limit || 1000,
        loopback: null != dns.loopback ? dns.loopback : false,
        multicast: null != dns.multicast ? dns.multicast : true,
        domain: dns.domain || 'cfs.local',
        server: dns.server || [
          '127.0.0.1',
          'cfa-alpha.us-east-1.littlstar.com',
          'cfa-beta.us-east-1.littlstar.com',
          'cfa-gamma.us-east-1.littlstar.com',
          'dns.us-east-1.littlstar.com',
        ],
      },

      dht: {
        maxPeers: dht.maxPeers || 10000,
        maxTables: dht.maxTables || 10000,
        bootstrap: dht.bootstrap || [
          {host: '127.0.0.1', port: 6881},
          {host: 'dht.us-east-1.littlstar.com', port: 6881},
          {host: 'cfa-alpha.us-east-1.littlstar.com', port: 6881},
          {host: 'cfa-beta.us-east-1.littlstar.com', port: 6881},
          {host: 'cfa-gamma.us-east-1.littlstar.com', port: 6881},
        ],
      }
    })

    // @TODO(werle): use swarm key below prior to 1.0.0 release
    //const discoveryKey = id && key ? createSHA256({id, key}) : cfs.discoveryKey
    swarm.once('error', onerror)
    swarm.listen(port || 0, onlisten)
    swarm.join(discoveryKey)
    swarm.setMaxListeners(Infinity)

    function onlisten(err) {
      if (err) { onerror(err) }
      else { swarm.removeListener('error', onerror) }
    }

    function onerror(err) {
      debug("onerror:", err)
      swarm.listen(0)
    }
  }

  if (false !== wrtc) {
      const hub = await createCFSSignalHub({discoveryKey: cfs.key})
      const wrtcSwarm = createWebRTCSwarm(hub, {
        //config: { iceServers: [{urls:`stun:localhost:19302`}] },
        wrtc: WebRTC,
      })

    if (null == swarm) {
      swarm = wrtcSwarm
    } else {
      swarm.on('close', () => { wrtcSwarm.close() })
      wrtcSwarm.on('error', (err) => {
        swarm.emit('error', err)
      })
      wrtcSwarm.on('peer', (peer, info) => {
        swarm.emit('connection', peer, info)
        const replicate = stream()
        pump(peer, replicate, peer)
          .on('error', (err) => { swarm.emit('error', err) })
      })
    }
  }

  return swarm
  function stream() {
    return cfs.replicate({
      download,
      upload,
      live,
    }).on('error', (err) => {
      swarm.emit('error', err)
    })
  }
}

module.exports = {
  createCFSDiscoverySwarm
}
