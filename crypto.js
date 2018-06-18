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
  const digest = Hash.sha256().update(x).digest('hex')
  return Buffer.from(digest, 'hex')
}

function nonce() {
  return sha256(randombytes(32))
}

module.exports = {
  generateRandomKeyPair,
  generateDiscoveryKey,
  generateKeyPair,
  blake2b,
  sha256,
  nonce,
}
