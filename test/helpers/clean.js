const fs = require('fs')
const rimraf = require('rimraf')
const debug = require('debug')('cfsnet:test')

// Cleans up after tests on Windows. See cleanup.js for more info

const txt = fs.readFileSync('test/helpers/cleanup.txt', 'utf8')
const lines = txt.split(/\r?\n/)
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  if (line) {
    rimraf(line, (err) => {
      if (err) {
        debug(err)
      }
    })
  }
}

rimraf('cleanup.txt', (err) => {
  if (err) {
    debug(err)
  }
})
