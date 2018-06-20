const fs = require('fs')
const rimraf = require('rimraf')

/**
 * In Unix, deletes the given path via rimraf.
 * Windows has an issue where file handles created by the current process are locked.
 * Node has no current solution to this.
 * As a workaround, we write a list of all paths to be deleted into cleanup.txt
 * in package.json. The posttest and pretest attributes fire clean.js which
 * deletes all the given files.
 */

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
