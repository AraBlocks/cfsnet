const fs = require('fs')
const rimraf = require('rimraf')

const isWin = 'win32' === process.platform
let stream = null
if (isWin) {
  stream = fs.createWriteStream('test/helpers/cleanup.txt', { flags: 'a' })
}

function remove(path, callback) {
  if (isWin) {
    stream.write(`${path}\n`)
    callback()
  } else {
    rimraf(path, callback)
  }
}
module.exports = {
  remove
}
