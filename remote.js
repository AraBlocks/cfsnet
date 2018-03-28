const { CFSNetworkAgent } = require('./agent')
const { normalizeCFSKey } = require('./key')

const kCFSRevisionHeader = 'x-cfs-revision'
const kCFSKeyHeader = 'x-cfs-key'
const kCFSIDHeader = 'x-cfs-id'

class CFSRemote extends CFSNetworkAgent {
  async read(filename, {id, key, revision}) {
    if ('/' != filename[0]) { filename = '/'+filename }
    return this.get({
      uri: filename,
      headers: {
        [kCFSRevisionHeader]: revision || '',
        [kCFSKeyHeader]: normalizeCFSKey(key),
        [kCFSIDHeader]: id,
      }
    })
  }

  async call(method, action, {id, key, revision}) {
    return this[method.toLowerCase()]({
      uri: `/~/${action}`,
      headers: {
        [kCFSRevisionHeader]: revision || '',
        [kCFSKeyHeader]: normalizeCFSKey(key),
        [kCFSIDHeader]: id,
      }
    })
  }

  async create(opts) {
    return this.call('POST', 'create', opts)
  }

  async destroy(opts) {
    return this.call('DELETE', 'destroy', opts)
  }

  async sync(opts) {
    return this.call('POST', 'sync', opts)
  }

  async status(opts) {
    return this.call('GET', 'status', opts)
  }
}

module.exports = {
  kCFSKeyHeader,
  kCFSIDHeader,
  CFSRemote
}
