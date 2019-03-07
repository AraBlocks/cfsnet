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
test.before(async () => {
  cfs = await createCFS({
    path: './.cfses'
  })
})

test.beforeEach(() => {
  sandbox.restore()
})

test('lstat is called without errors', async (t) => {
  t.plan(1)

  sandbox.stub(cfs.partitions.home, 'lstat').callsFake((_, _2, cb) => {
    t.pass()
    cb()
  })

  try {
    await cfs.lstat('test')
  } catch (e) {
    t.fail(e)
  }
})

test('lstat is called with cb', async (t) => {
  t.plan(1)

  sandbox.stub(cfs.partitions.home, 'lstat').callsFake((_, _2, cb) => {
    cb()
  })

  await new Promise((resolve, reject) => {
    cfs.lstat('test', (err) => {
      if (err) t.fail(err) && reject(err) // eslint-disable-line no-unused-expressions
      t.pass()
      resolve()
    })
  })
})
