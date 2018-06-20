const { createCFS } = require('../../create')
const { test } = require('ava')
const cleanup = require('../../test/helpers/cleanup')
const sinon = require('sinon')

test.cb.after(t => {
  t.plan(0)

  cleanup.remove('.cfses', t.end)
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

test('mkdirp is called without errors', async t => {
  t.plan(1)

  const spy = sandbox.spy(cfs.partitions.home, 'mkdirp')
  try {
    await cfs.mkdirp('test')
    t.true(spy.called)
  } catch (e) {
    t.fail(e)
  }
})

test('mkdirp is called with cb', async t => {
  t.plan(1)

  const spy = sandbox.spy(cfs.partitions.home, 'mkdirp')

  await new Promise((resolve, reject) => {
    cfs.mkdirp('test', (err) => {
      if (err) t.fail(err) && reject(err)

      t.is(typeof spy.firstCall.args[1], 'function')
      resolve()
    })
  })
})
