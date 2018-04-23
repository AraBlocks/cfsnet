console.warn(`
  Requiring the "index" (index.js) of the 'cfsnet' module is now deprecated".
  Please require the 'cfsnet' module directly (require('cfsnet/create')) instead.
`)

Object.assign(exports,
  require('./agent'),
  require('./key-path'),
  require('./log'),
  require('./create'),
  require('./destroy'),
  require('./drive'),
  require('./drives'),
  require('./env'),
  require('./key'),
  require('./remote'),
  require('./sha256'),
  require('./swarm'),
  require('./tree')
)
