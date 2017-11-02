'use strict'

const kCFSKeyProtocolScheme = 'cfs://'

function normalizeCFSKey(key) {
  return String(key || '').replace(kCFSKeyProtocolScheme, '')
}

module.exports = {
  kCFSKeyProtocolScheme,
  normalizeCFSKey,
}
