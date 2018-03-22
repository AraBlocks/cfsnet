'use strict'

const SignalHub = require('signalhub')
const { hash } = require('./crypto')

function createCFSSignalHub({id, key, urls}) {
  return new SignalHub(hash(id + key), urls)
}

module.exports = {
  createCFSSignalHub
}
