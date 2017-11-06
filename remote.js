const { CFSNetworkAgent } = require('./agent')

const kCFSKeyHeader = 'X-CFS-KEY'
const kCFSIDHeader = 'X-CFS-ID'

class CFSRemote extends CFSNetworkAgent {
  async create({id, key}) {
    return this.post({
      uri: '/create',
      headers: {
        [kCFSKeyHeader]: key,
        [kCFSIDHeader]: id,
      }
    })
  }

  async sync({id, key}) {
    return this.post({
      uri: '/sync',
      headers: {
        [kCFSKeyHeader]: key,
        [kCFSIDHeader]: id,
      }
    })
  }

  async status({id, key}) {
    return this.post({
      uri: '/status',
      headers: {
        [kCFSKeyHeader]: key,
        [kCFSIDHeader]: id,
      }
    })
  }
}

module.exports = {
  CFSRemote
}
