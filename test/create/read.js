const { existsSync } = require('fs')
const constants = require('../../constants')
const { createCFS } = require('../../create')
const { test } = require('ava')
const rimraf = require('rimraf')
const sinon = require('sinon')

test.cb.after(t => {
  t.plan(0)

  rimraf('.cfses', t.end)
})

test('read is called without errors', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  cfs.fileDescriptors[20] = cfs.partitions.home

  sinon.stub(cfs.partitions.home, 'read').callsFake((_, cb) => {
    cb()
  })

  try {
    await cfs.read(20)
    t.pass()
  } catch (e) {
    t.fail(e)
  }
})

test('read fails with no fd', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  try {
    await cfs.read()
    t.fail('read when it should have thrown an error')
  } catch (e) {
    t.pass()
  }
})

test('read fails with negative fd', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  try {
    await cfs.read(-1, {})
    t.fail('read when it should have thrown an error')
  } catch (e) {
    t.pass()
  }
})
