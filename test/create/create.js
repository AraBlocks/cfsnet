const { existsSync } = require('fs')
const { createCFS } = require('../../create')
const { test } = require('ava')
const rimraf = require('rimraf')
const cleanup = require('../../cleanup')



test('cfs is created', async t => {
  const cfs = await createCFS({
    path: './test'
  })

  t.true(existsSync('test'))
})



test('cfs is created in non-existant folder', async (t) => {
  const cfs = await createCFS({
    path: './doesntExist'
  })

  t.true(existsSync('doesntExist'))
})

test.cb.after((t) => {
  t.plan(0)
  cleanup.remove('doesntexist', t.end)
})


test.cb.after((t) => {
  t.plan(0)
  const partitions = ['etc', 'home', 'lib', 'metadata', 'tmp', 'var']
  cleanup.remove(`./test{/${partitions.join(',/')}}`, t.end)
})
