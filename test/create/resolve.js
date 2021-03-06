const { createCFS } = require('../../create')
const cleanup = require('../../test/helpers/cleanup')
const test = require('ava')

test.afterEach.cb((t) => {
  t.plan(0)
  cleanup.remove('testcfs', t.end)
})

let cfs
test.before(async () => {
  cfs = await createCFS({
    path: './testcfs'
  })
})

test('gets var partition', (t) => {
  const partition = cfs.partitions.resolve('/var')

  t.is(partition.key.toString('hex'), cfs.partitions.var.key.toString('hex'))
})

test('gets home partition', (t) => {
  const partition = cfs.partitions.resolve('var')

  t.is(partition.key.toString('hex'), cfs.partitions.home.key.toString('hex'))
})
