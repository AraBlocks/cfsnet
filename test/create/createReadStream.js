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

test.serial('read stream is created', async t => {
  sandbox.stub(cfs.partitions.home, 'createReadStream').callsFake((fileName) => {
    if ('win32' === process.platform) {
      t.true(fileName.includes('\\home\\test'))
    }else{
      t.is(fileName, '/test')
    }
  })

  const readStream = cfs.createReadStream('test')
})
