const constants = require('../../constants')
const { createCFS } = require('../../create')
const { test } = require('ava')
const rimraf = require('rimraf')

test.cb.after(t => {
  t.plan(0)

  rimraf('.cfses', t.end)
})

test('write stream is created', async t => {
  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  const writeStream = cfs.createWriteStream('test')

  t.true(!!writeStream.write)
})
