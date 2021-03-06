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

test('rimraf is called without errors', async (t) => {
  t.plan(1)

  const stub = sandbox.stub(cfs.partitions.home, 'rimraf').callsFake((_, cb) => {
    stub.restore()
    t.pass()
    cb()
  })

  try {
    await cfs.rimraf('test')
  } catch (e) {
    t.fail(e)
  }
})

test('rimraf is called with cb', async (t) => {
  t.plan(1)

  const stub = sandbox.stub(cfs.partitions.home, 'rimraf').callsFake((_, cb) => {
    stub.restore()
    cb()
  })

  await new Promise((resolve, reject) => {
    cfs.rimraf('test', (err) => {
      if (err) t.fail(err) && reject(err) // eslint-disable-line no-unused-expressions

      t.pass()
      resolve()
    })
  })
})
