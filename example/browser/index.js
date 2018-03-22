'use strict'

const { createCFSDiscoverySwarm } = require('../../swarm')
const { createCFS } = require('../../create')
const ram = require('random-access-memory')

void async function main() {
  const id = 'werle/werle'
  //const key = 'd71e038569c1b0035963ce80955902079355a6f06f1f31b1498f63ffc95ce096'
  const key = '90405d1016dc29774a6ac538806b0c866057c98d84c995f427aa91259b7dda06'
  //const key = null
  const cfs = await createCFS({storage: ram, key, id})
  const swarm = await createCFSDiscoverySwarm({id, key, cfs})

  console.log(cfs.key.toString('hex'));
  window.swarm = swarm
  window.cfs = cfs
  cfs.metadata.update(() => {
    cfs.readdir(cfs.HOME, console.log)
  })
}()
