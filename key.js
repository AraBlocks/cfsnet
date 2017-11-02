'use strict'

const kCFSKeyAndIDProtocolScheme = 'cfs+id://'
const kCFSKeyProtocolScheme = 'cfs://'

/**
 */
function normalizeCFSKey(key) {
  if (null == key) {
    return null
  } else {
    return String(key || '')
      .replace(kCFSKeyProtocolScheme, '')
      .replace(kCFSKeyAndIDProtocolScheme, '')
  }
}

module.exports = {
  kCFSKeyProtocolScheme,
  normalizeCFSKey,
}
