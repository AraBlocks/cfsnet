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
  cfs.fileDescriptors['20'] = null
  sandbox.restore()
})

test.serial('successfully closes cfs', async (t) => {
  // Stub the partition close
  Object.values(cfs.partitions).forEach(partition => sandbox.stub(partition, 'close').callsFake((cb) => {
    t.pass()
    cb()
  }))

  try {
    await cfs.close()
  } catch (e) {
    t.fail(e)
  }
})

test.serial('successfully closes file descriptor', async (t) => {
  const off = Object.keys(cfs.partitions).indexOf('home')
  cfs.fileDescriptors[20 + off] = cfs.partitions.home
  sandbox.stub(cfs.partitions.home, 'close').callsFake((fd, cb) => {
    t.is(fd, 20)
    cb()
  })

  try {
    await cfs.close(off + 20)
  } catch (e) {
    t.fail(e)
  }
})
