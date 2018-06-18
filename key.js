const kCFSKeyProtocolScheme = 'cfs://'

/**
 * Normalize key value to a string or null value
 * removing protocol schemes and converting buffers
 * to a 'hex' encoded string. `null` is returned for key
 * values that are given as `null` or `undefined`, otherwise
 * an empty string is returned for "falsy" values.
 * @public
 * @param {String|Buffer|null} key
 * @return {String|null}
 */
function normalizeCFSKey(key) {
  if (null == key) {
    return null
  } else if (Buffer.isBuffer(key)) {
    key = key.toString('hex')
  } else {
    key = String(key || '')
  }
  return key.replace(kCFSKeyProtocolScheme, '')
}

module.exports = {
  kCFSKeyProtocolScheme,
  normalizeCFSKey,
}
