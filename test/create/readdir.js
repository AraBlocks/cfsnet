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

test('readdir is called without errors', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  sinon.stub(cfs.partitions.home, 'readdir').callsFake((_, _2, cb) => {
    t.pass()
    cb()
  })

  try {
    await cfs.readdir('test')
  } catch (e) {
    t.fail(e)
  }
})

test('readdir is called without errors - opts', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  sinon.stub(cfs.partitions.home, 'readdir').callsFake((_, _2, cb) => {
    t.pass()
    cb()
  })

  try {
    await cfs.readdir('test', {})
  } catch (e) {
    t.fail(e)
  }
})

test('readdir is called with cb', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  sinon.stub(cfs.partitions.home, 'readdir').callsFake((_, _2, cb) => {
    cb()
  })

  await new Promise((resolve, reject) => {
    cfs.readdir('test', (err) => {
      if (err) t.fail(err) && reject(err)

      t.pass()
      resolve()
    })
  })
})
