const { createCFS } = require('../../create')
const { test } = require('ava')
const rimraf = require('rimraf')
const sinon = require('sinon')

test.cb.after(t => {
  t.plan(0)

  rimraf('.cfses', t.end)
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
