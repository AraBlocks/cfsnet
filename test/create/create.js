const { existsSync } = require('fs')
const { createCFS } = require('../../create')
const { test } = require('ava')
const cleanup = require('../../test/helpers/cleanup')


test('cfs is created', async (t) => {
  const cfs = await createCFS({ // eslint-disable-line no-unused-vars
    path: './test'
  })

  t.true(existsSync('test'))
})

test('cfs is created in non-existant folder', async (t) => {
  const cfs = await createCFS({ // eslint-disable-line no-unused-vars
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
