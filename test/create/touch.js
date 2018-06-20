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

test('touch is called without errors', async t => {
  t.plan(1)

  sandbox.stub(cfs.partitions.home, 'touch').callsFake((_, cb) => {
    t.pass()
    cb()
  })

  try {
    await cfs.touch('test')
  } catch (e) {
    t.fail(e)
  }
})

test('touch is called with cb', async t => {
  t.plan(1)

  sandbox.stub(cfs.partitions.home, 'touch').callsFake((_, cb) => {
    cb()
  })

  await new Promise((resolve, reject) => {
    cfs.touch('test', (err) => {
      if (err) t.fail(err) && reject(err)

      t.pass()
      resolve()
    })
  })
})
