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
  cfs.fileDescriptors[20] = null
  sandbox.restore()
})

test.serial('read is called without errors', async (t) => {
  t.plan(1)

  cfs.fileDescriptors[20] = cfs.partitions.home

  const stub = sandbox.stub(cfs.partitions.home, 'read').callsFake((_, cb) => {
    stub.restore()
    cb()
  })

  try {
    await cfs.read(20)
    t.pass()
  } catch (e) {
    t.fail(e)
  }
})

test('read fails with no fd', async (t) => {
  t.plan(1)

  try {
    await cfs.read()
    t.fail('read when it should have thrown an error')
  } catch (e) {
    t.pass()
  }
})

test('read fails with negative fd', async (t) => {
  t.plan(1)

  try {
    await cfs.read(-1, {})
    t.fail('read when it should have thrown an error')
  } catch (e) {
    t.pass()
  }
})
