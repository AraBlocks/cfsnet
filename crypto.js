const randombytes = require('randombytes')
const sodium = require('sodium-universal')
const Hash = require('hash.js')
const {
  discoveryKey,
  keyPair,
  verify,
  sign,
} = require('hypercore-crypto')

function generateRandomKeyPair() {
  return generateKeyPair(randombytes(32))
}

function generateDiscoveryKey(x) {
  return discoveryKey(x)
}

function generateKeyPair(x) {
  if (x) {
    return keyPair(Buffer.from(x).slice(0, 32))
  }
  return keyPair()
}

function sha256(x) {
  const digest = Hash.sha256().update(x).digest('hex')
  return Buffer.from(digest, 'hex')
}

function blake2b(buffer) {
  const digest = Buffer.allocUnsafe(32)
  sodium.crypto_generichash(digest, buffer)
  return digest
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
  verify,
  nonce,
  sign,
}
