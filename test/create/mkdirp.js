const { createCFS } = require('../../create')
const cleanup = require('../../test/helpers/cleanup')
const sinon = require('sinon')
const test = require('ava')

test.afterEach.cb((t) => {
  t.plan(0)

  cleanup.remove('.cfses', t.end)
})

const sandbox = sinon.createSandbox()

let cfs
test.beforeEach(async () => {
  cfs = await createCFS({
    path: './.cfses'
  })
  sandbox.restore()
})

test('mkdirp is called without errors', async (t) => {
  t.plan(1)

  const spy = sandbox.spy(cfs.partitions.home, 'mkdirp')
  try {
    await cfs.mkdirp('test')
    t.true(spy.called)
  } catch (e) {
    t.fail(e)
  }
})

test('mkdirp is called with cb', async (t) => {
  t.plan(2)

  const spy = sandbox.spy(cfs.partitions.home, 'mkdirp')

  await new Promise((resolve, reject) => {
    cfs.mkdirp('test', (err) => {
      if (err) t.fail(err) && reject(err) // eslint-disable-line no-unused-expressions

      t.is(typeof spy.firstCall.args[1], 'object')
      t.is(typeof spy.firstCall.args[2], 'function')
      resolve()
    })
  })
})
