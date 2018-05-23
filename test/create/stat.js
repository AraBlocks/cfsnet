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

test('stat is called without errors', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  sinon.stub(cfs.partitions.home, 'stat').callsFake((_, cb) => {
    t.pass()
    cb()
  })

  try {
    await cfs.stat('test')
  } catch (e) {
    console.log("EE:", e)
    t.fail(e)
  }
})

test('stat is called with cb', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  sinon.stub(cfs.partitions.home, 'stat').callsFake((_, cb) => {
    t.pass()
    cb()
  })

  await new Promise((resolve, reject) => {
    cfs.stat('test', (err) => {
      if (err) t.fail(err) && reject(err)

      resolve()
    })
  })
})
