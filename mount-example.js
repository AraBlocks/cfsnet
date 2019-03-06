/* eslint-disable no-console */
const { createCFS } = require('./create')
const { mount } = require('./fuse')
const mkdirp = require('mkdirp')
const pify = require('pify')
const ram = require('random-access-memory')

process.on('unhandledRejection', console.error)

void main().catch(console.error)
async function main() {
  const storage = () => ram()
  const writer = await createCFS({ id: 'writer', storage })
  const reader = await createCFS({
    id: 'reader',
    key: writer.key,
    storage,
    partitions: {
      etc: { key: writer.partitions.etc.key },
      lib: { key: writer.partitions.lib.key },
      var: { key: writer.partitions.var.key },
    }
  })

  await pify(mkdirp)('./mnt/reader')
  await pify(mkdirp)('./mnt/writer')
  await mount('./mnt/reader', reader)
  await mount('./mnt/writer', writer)
  await replicate(writer, reader)

  reader.readFile('/etc/cfs-signature', console.log)
  reader.readdir('/etc', console.log)
}

async function replicate(src, dst) {
  const x = src.replicate({ live: true })
  const y = dst.replicate({ live: true })
  x.pipe(y).pipe(x)
  await new Promise(resolve => dst.on('update', resolve))
}
