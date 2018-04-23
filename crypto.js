'use strict'

const { keyPair, discoveryKey } = require('hypercore/lib/crypto')
const randombytes = require('randombytes')
const sodium = require('sodium-universal')
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

function blake2b(buffer) {
  const digest = Buffer.allocUnsafe(32)
  sodium.crypto_generichash(digest, buffer)
  return digest
}

function sha256(x) {
  return Hash.sha256().update(x).digest('hex')
}

function nonce() {
  return hash(Math.random())
}

function hash(x) {
  return sha256(x)
}

module.exports = {
  generateRandomKeyPair,
  generateDiscoveryKey,
  generateKeyPair,
  blake2b,
  sha256,
  nonce,
  hash,
}
