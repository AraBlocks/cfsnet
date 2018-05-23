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

test('rimraf is called without errors', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  sinon.stub(cfs.partitions.home, 'rimraf').callsFake((_, cb) => {
    t.pass()
    cb()
  })

  try {
    await cfs.rimraf('test')
  } catch (e) {
    t.fail(e)
  }
})

test('rimraf is called with cb', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  sinon.stub(cfs.partitions.home, 'rimraf').callsFake((_, cb) => {
    cb()
  })

  await new Promise((resolve, reject) => {
    cfs.rimraf('test', (err) => {
      if (err) t.fail(err) && reject(err)

      t.pass()
      resolve()
    })
  })
})
