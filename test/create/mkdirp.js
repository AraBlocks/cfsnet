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

test('mkdirp is called without errors', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  const spy = sinon.spy(cfs.partitions.home, 'mkdirp')
  try {
    await cfs.mkdirp('test')
    t.true(spy.called)
  } catch (e) {
    t.fail(e)
  }
})

test('mkdirp is called with cb', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  const spy = sinon.spy(cfs.partitions.home, 'mkdirp')

  await new Promise((resolve, reject) => {
    cfs.mkdirp('test', (err) => {
      if (err) t.fail(err) && reject(err)

      t.is(typeof spy.firstCall.args[1], 'function')
      resolve()
    })
  })
})
