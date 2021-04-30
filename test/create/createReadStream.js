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

test.serial('read stream is created', async (t) => {
  const stub = sandbox.stub(cfs.partitions.home, 'createReadStream').callsFake((fileName) => {
    stub.restore()
    if ('win32' === process.platform) {
      t.true(fileName.includes('\\home\\test'))
    } else {
      t.is(fileName, '/test')
    }
  })

  const readStream = cfs.createReadStream('test') // eslint-disable-line no-unused-vars
})
