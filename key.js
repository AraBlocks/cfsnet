'use strict'

const kCFSKeyAndIDProtocolScheme = 'cfs+id://'
const kCFSKeyProtocolScheme = 'cfs://'

/**
 * Normalize key value to a string or null value
 * removing protocol schemes
 * @public
 * @param {String|Buffer|null} key
 * @return {String|null}
 */
function normalizeCFSKey(key) {
  if (null == key) {
    return null
  } else {
    return (key instanceof Buffer ?  key.toString('hex') : String(key || ''))
      .replace(kCFSKeyProtocolScheme, '')
      .replace(kCFSKeyAndIDProtocolScheme, '')
  }
}

module.exports = {
  kCFSKeyAndIDProtocolScheme,
  kCFSKeyProtocolScheme,
  normalizeCFSKey,
}
