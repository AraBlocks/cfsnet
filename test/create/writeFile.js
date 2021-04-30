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

test('writeFile is called without errors', async (t) => {
  t.plan(1)

  const stub = sandbox.stub(cfs.partitions.home, 'writeFile').callsFake((_, _2, _3, cb) => {
    stub.restore()
    t.pass()
    cb()
  })

  try {
    await cfs.writeFile('test', Buffer.from('test'), {})
  } catch (e) {
    t.fail(e)
  }
})

test('writeFile is called without errors - opts', async (t) => {
  t.plan(1)

  const stub = sandbox.stub(cfs.partitions.home, 'writeFile').callsFake((_, _2, _3, cb) => {
    stub.restore()
    t.pass()
    cb()
  })

  try {
    await cfs.writeFile('test', Buffer.from('test'), {})
  } catch (e) {
    t.fail(e)
  }
})

test('writeFile is called without errors - str', async (t) => {
  t.plan(1)

  const stub = sandbox.stub(cfs.partitions.home, 'writeFile').callsFake((_, buf, _3, cb) => {
    stub.restore()
    t.true(buf instanceof Buffer)
    cb()
  })

  try {
    await cfs.writeFile('test', 'test', {})
  } catch (e) {
    t.fail(e)
  }
})

test('writeFile is called with cb', async (t) => {
  t.plan(1)

  sandbox.stub(cfs.partitions.home, 'writeFile').callsFake((_, _2, _3, cb) => {
    t.pass()
    cb()
  })

  await new Promise((resolve, reject) => {
    cfs.writeFile('test', '', {}, (err) => {
      if (err) t.fail(err) && reject(err) // eslint-disable-line no-unused-expressions

      resolve()
    })
  })
})
