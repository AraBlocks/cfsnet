'use strict'

const { createCFSDiscoverySwarm } = require('../../swarm')
const { createCFS } = require('../../create')
const ram = require('random-access-memory')

void async function main() {
  const id = 'test'
  const cfs = await createCFS({storage: ram, id})
  const swarm = await createCFSDiscoverySwarm({cfs})

  cfs.readdir(cfs.HOME, console.log)
}()
