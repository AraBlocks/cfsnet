const SignalHub = require('signalhub')

function createCFSSignalHub({ discoveryKey, urls }) {
  return new SignalHub(
    Buffer.isBuffer(discoveryKey) ? discoveryKey.toString('hex') : discoveryKey,
    urls || ['https://signalhub.littlstar.com']
  )
}

module.exports = {
  createCFSSignalHub
}
