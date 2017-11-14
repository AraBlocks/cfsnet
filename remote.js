const { CFSNetworkAgent } = require('./agent')
const { normalizeCFSKey } = require('./key')

const kCFSKeyHeader = 'X-CFS-KEY'
const kCFSIDHeader = 'X-CFS-ID'

class CFSRemote extends CFSNetworkAgent {
  async create({id, key}) {
    return this.post({
      uri: '/create',
      headers: {
        [kCFSKeyHeader]: normalizeCFSKey(key),
        [kCFSIDHeader]: id,
      }
    })
  }

  async destroy({id, key}) {
    return this.post({
      uri: '/destroy',
      headers: {
        [kCFSKeyHeader]: normalizeCFSKey(key),
        [kCFSIDHeader]: id,
      }
    })
  }

  async sync({id, key}) {
    return this.post({
      uri: '/sync',
      headers: {
        [kCFSKeyHeader]: normalizeCFSKey(key),
        [kCFSIDHeader]: id,
      }
    })
  }

  async status({id, key}) {
    return this.post({
      uri: '/status',
      headers: {
        [kCFSKeyHeader]: normalizeCFSKey(key),
        [kCFSIDHeader]: id,
      }
    })
  }
}

module.exports = {
  kCFSKeyHeader,
  kCFSIDHeader,
  CFSRemote
}
