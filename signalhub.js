'use strict'

const SignalHub = require('signalhub')
const { hash } = require('./crypto')

function createCFSSignalHub({discoveryKey, urls}) {
  return new SignalHub(
    Buffer.from(discoveryKey).toString('hex'),
    urls || [ 'https://signalhub.littlstar.com' ]
  )
}

module.exports = {
  createCFSSignalHub
}
