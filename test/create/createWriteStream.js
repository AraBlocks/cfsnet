const { createCFS } = require('../../create')
const cleanup = require('../../test/helpers/cleanup')
const test = require('ava')

test.afterEach.cb((t) => {
  t.plan(0)

  cleanup.remove('.cfses', t.end)
})

let cfs
test.before(async () => {
  cfs = await createCFS({
    path: './.cfses'
  })
})

test('write stream is created', async (t) => {
  const writeStream = cfs.createWriteStream('test')

  t.true(!!writeStream.write)
})
