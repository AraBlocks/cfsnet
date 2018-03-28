'use strict'

const SignalHub = require('signalhub')
const { hash } = require('./crypto')

function createCFSSignalHub({discoveryKey, urls}) {
  return new SignalHub(
    Buffer.isBuffer(discoveryKey) ? discoveryKey.toString('hex') : discoveryKey,
    urls || [ 'https://signalhub.littlstar.com' ]
    //urls || [ 'http://localhost:8888' ]
  )
}

module.exports = {
  createCFSSignalHub
}
