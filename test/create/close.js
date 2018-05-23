const { existsSync } = require('fs')
const { createCFS } = require('../../create')
const { test } = require('ava')
const rimraf = require('rimraf')
const pify = require('pify')
const sinon = require('sinon')

test.cb.after(t => {
  t.plan(0)

  rimraf('.cfses', t.end)
})

test('successfully closes cfs', async t => {
  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  // Stub the partition close
  Object.values(cfs.partitions).forEach(partition => {
    return sinon.stub(partition, 'close').callsFake((cb) => {
      t.pass()
      cb()
    })
  })

  try {
    await cfs.close()
  } catch (e) {
    t.fail(e)
  }
})

test('successfully closes file descriptor', async t => {
  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  cfs.fileDescriptors['20'] = cfs.partitions.home
  sinon.stub(cfs.partitions.home, 'close').callsFake((fd, cb) => {
    t.is(fd, 20)
    cb()
  })

  try {
    await cfs.close(20)
  } catch (e) {
    t.fail(e)
  }
})
