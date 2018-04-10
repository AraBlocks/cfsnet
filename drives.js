'use strict'

const { createCFSKeyPath } = require('./key-path')
const debug = require('debug')('cfsnet:drive:map')

Object.assign(exports, new class {
  has(value) {
    value = value || {}
    const { id, key, cfs } = value
    if (cfs && cfs.identifier && cfs.key) {
      const path = createCFSKeyPath({id: cfs.identifier, key: cfs.key})
      return path in this
    } else if (id) {
      const path = createCFSKeyPath({id, key})
      return path in this
    } else {
      return false
    }
  }
})
