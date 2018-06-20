const { createCFS } = require('../../create')
const { test } = require('ava')
const cleanup = require('../../test/helpers/cleanup')
const sinon = require('sinon')

test.cb.after(t => {
  t.plan(0)

  cleanup.remove('.cfses', t.end)
})

let cfs
test.before(async t => {
  cfs = await createCFS({
    path: `./.cfses`
  })
})

test('write stream is created', async t => {
  const writeStream = cfs.createWriteStream('test')

  t.true(!!writeStream.write)
})
