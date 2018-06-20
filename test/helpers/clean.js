const fs = require('fs')
const rimraf = require('rimraf')

const txt = fs.readFileSync('test/helpers/cleanup.txt', 'utf8')
const lines = txt.split(/\r?\n/)
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  if (line)
    rimraf(line, (err) => {
      if (err)
        console.log(err)
    })
}
rimraf("cleanup.txt", (err) => {
  if (err)
    console.log(err)
})
