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

test('replicate is called without errors', async (t) => {
  t.plan(1)

  const stub = sandbox.stub(cfs.partitions, 'resolve').callsFake((name) => {
    stub.restore()
    t.is('/', name)
    return cfs.partitions.home
  })

  try {
    await cfs.replicate('/')
  } catch (e) {
    t.fail(e)
  }
})

test('replicate works without defining partition name and opts', async (t) => {
  let planned = 0
  for (const k in cfs.partitions) {
    if ('function' === typeof cfs.partitions[k].replicate) {
      planned++
      const stub = sandbox.stub(cfs.partitions[k], 'replicate').callsFake((opts) => {
        stub.restore()
        t.is(typeof opts.stream, 'object')
      })
    }
  }

  t.plan(planned)

  cfs.replicate({})
})
