const { existsSync } = require('fs')
const { createCFS } = require('../../create')
const { test } = require('ava')
const rimraf = require('rimraf')

test.cb.after(t => {
  t.plan(0)

  const partitions = [ 'etc', 'home', 'lib', 'metadata', 'tmp', 'var' ]
  rimraf(`./test{/${partitions.join(',/')}}`, t.end)
})

test('cfs is created', async t => {
  const cfs = await createCFS({
    path: './test'
  })

  t.true(existsSync('test'))
})

test.cb.after(t => {
  t.plan(0)
  rimraf('doesntExist', t.end)
})

test('cfs is created in non-existant folder', async t => {
  const cfs = await createCFS({
    path: './doesntExist'
  })

  t.true(existsSync('doesntExist'))
})
