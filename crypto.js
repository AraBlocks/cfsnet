'use strict'

const { keyPair, discoveryKey } = require('hypercore/lib/crypto')
const randombytes = require('randombytes')
const Hash = require('hash.js')

function generateRandomKeyPair() {
  return generateKeyPair(randombytes(32))
}

function generateDiscoveryKey(x) {
  return discoveryKey(x)
}

function generateKeyPair(x) {
  return keyPair(x)
}

function sha256(x) {
  return Hash.sha256().update(x).digest('hex')
}

function hash(x) {
  return sha256(x)
}

module.exports = {
  generateRandomKeyPair,
  generateDiscoveryKey,
  generateKeyPair,
  sha256,
  hash,
}
