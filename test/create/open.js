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

test.serial('open is called without errors', async (t) => {
  t.plan(2)

  const stub = sandbox.stub(cfs.partitions.home, 'open').callsFake((path, err, cb) => {
    stub.restore()
    t.is('/test', path)
    t.is(err, null)
    cb(null, 20)
  })

  try {
    await cfs.open('test')
  } catch (e) {
    t.fail(e)
  }
})

test.serial('open is called without errors - flags', async (t) => {
  t.plan(1)

  const stub = sandbox.stub(cfs.partitions.home, 'open').callsFake((path, err, cb) => {
    stub.restore()
    t.pass()
    cb(null, 20)
  })

  try {
    await cfs.open('test')
  } catch (e) {
    t.fail(e)
  }
})

test.serial('open is called without errors - mode', async (t) => {
  t.plan(1)

  const stub = sandbox.stub(cfs.partitions.home, 'open').callsFake((path, err, cb) => {
    stub.restore()
    t.pass()
    cb(null, 20)
  })

  try {
    await cfs.open('test', {})
  } catch (e) {
    t.fail(e)
  }
})

test.serial('open is called with cb', async (t) => {
  t.plan(1)

  const stub = sandbox.stub(cfs.partitions.home, 'open').callsFake((path, err, cb) => {
    stub.restore()
    cb(null, 20)
  })

  await new Promise((resolve, reject) => {
    cfs.open('test', (err) => {
      if (err) t.fail(err) && reject(err) // eslint-disable-line no-unused-expressions
      t.pass()
      resolve()
    })
  })
})
