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

test('writeFile is called without errors', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  sinon.stub(cfs.partitions.home, 'writeFile').callsFake((_, _2, _3, cb) => {
    t.pass()
    cb()
  })

  try {
    await cfs.writeFile('test', Buffer.from('test'), {})
  } catch (e) {
    t.fail(e)
  }
})

test('writeFile is called without errors - opts', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  sinon.stub(cfs.partitions.home, 'writeFile').callsFake((_, _2, _3, cb) => {
    t.pass()
    cb()
  })

  try {
    await cfs.writeFile('test', Buffer.from('test'), {})
  } catch (e) {
    t.fail(e)
  }
})

test('writeFile is called without errors - str', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  sinon.stub(cfs.partitions.home, 'writeFile').callsFake((_, buf, _3, cb) => {
    t.true(buf instanceof Buffer)
    cb()
  })

  try {
    await cfs.writeFile('test', 'test', {})
  } catch (e) {
    t.fail(e)
  }
})

test('writeFile is called with cb', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  sinon.stub(cfs.partitions.home, 'writeFile').callsFake((_, _2, _3, cb) => {
    t.pass()
    cb()
  })

  await new Promise((resolve, reject) => {
    cfs.writeFile('test', '', {}, (err) => {
      if (err) t.fail(err) && reject(err)

      resolve()
    })
  })
})
