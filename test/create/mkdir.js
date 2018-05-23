const { createCFS } = require('../../create')
const { test } = require('ava')
const rimraf = require('rimraf')
const sinon = require('sinon')

test.cb.after(t => {
  t.plan(0)

  rimraf('.cfses', t.end)
})

const sandbox = sinon.createSandbox()

let cfs
test.before(async t => {
  cfs = await createCFS({
    path: `./.cfses`
  })
})

test.beforeEach(t => {
  sandbox.restore()
})

test('mkdir is called without errors', async t => {
  t.plan(1)

  const spy = sandbox.spy(cfs.partitions.home, 'mkdir')

  try {
    await cfs.mkdir('test')
    t.true(spy.called)
  } catch (e) {
    t.fail(e)
  }
})

test('mkdir is called with cb', async t => {
  t.plan(1)

  const spy = sandbox.spy(cfs.partitions.home, 'mkdir')

  await new Promise((resolve, reject) => {
    cfs.mkdir('test', (err) => {
      if (err) t.fail(err) && reject(err)

      t.is(typeof spy.firstCall.args[1], 'function')
      resolve()
    })
  })
})
