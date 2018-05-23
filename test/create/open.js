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

test.serial('open is called without errors', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  sinon.stub(cfs.partitions.home, 'open').callsFake((_, _2, _3, cb) => {
    t.pass()
    cb(null, 20)
  })

  try {
    await cfs.open('test', {}, {})
  } catch (e) {
    t.fail(e)
  }
})

test.serial('open is called without errors - flags', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  sinon.stub(cfs.partitions.home, 'open').callsFake((_, _2, _3, cb) => {
    t.pass()
    cb(null, 20)
  })

  try {
    await cfs.open('test')
  } catch (e) {
    t.fail(e)
  }
})

test.serial('open is called without errors - mode', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  sinon.stub(cfs.partitions.home, 'open').callsFake((_, _2, _3, cb) => {
    t.pass()
    cb(null, 20)
  })

  try {
    await cfs.open('test', {})
  } catch (e) {
    t.fail(e)
  }
})

test.serial('open is called with cb', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  sinon.stub(cfs.partitions.home, 'open').callsFake((_, _2, _3, cb) => {
    cb(null, 20)
  })

  await new Promise((resolve, reject) => {
    cfs.open('test', (err) => {
      if (err) t.fail(err) && reject(err)
      t.pass()
      resolve()
    })
  })
})
