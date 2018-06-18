const { createCFS } = require('../../create')
const constants = require('../../constants')
const { test } = require('ava')
const cleanup = require('../../test/helpers/cleanup')
const sinon = require('sinon')

test.cb.after((t) => {
  t.plan(0)

  cleanup.remove('.cfses', t.end)
})

const sandbox = sinon.createSandbox()

let cfs
test.before(async () => {
  cfs = await createCFS({
    id: `test/access`,
    path: './.cfses'
  })
})

test.beforeEach(() => {
  cfs.partitions.home.metadata.writable = true
  cfs.partitions.home.metadata.readable = true

  sandbox.restore()
})

test.serial('W_OK access fails when CFS closed', async (t) => {
  try {
    await cfs.access('test', constants.W_OK)
    t.fail()
  } catch (e) {
    t.pass()
  }
})

test.serial('R_OK access fails when CFS closed', async (t) => {
  cfs.partitions.home.metadata.readable = false

  try {
    await cfs.access('test', constants.R_OK)
    t.fail()
  } catch (e) {
    t.pass()
  }
})

test.serial('F_OK access fails when CFS closed', async (t) => {
  cfs.partitions.home.metadata.writable = false

  try {
    await cfs.access('test', constants.F_OK)
    t.fail()
  } catch (e) {
    t.pass()
  }
})

test('W_OK access passes', async (t) => {
  try {
    await cfs.access('/var', constants.W_OK)
    t.pass()
  } catch (e) {
    console.log(e)
    t.fail()
  }
})

test('R_OK access passes', async (t) => {
  try {
    await cfs.access('/var', constants.R_OK)
    t.pass()
  } catch (e) {
    console.log(e)
    t.fail()
  }
})

test('F_OK access passes', async (t) => {
  try {
    await cfs.access('/var', constants.F_OK)
    t.pass()
  } catch (e) {
    console.log(e)
    t.fail()
  }
})

test.serial('F_OK access implicitly checked', async (t) => {
  const spy = sinon.spy(cfs.partitions.var, 'access')

  try {
    await cfs.access('/var')
    t.true(spy.called)
  } catch (e) {
    console.log(e)
    t.fail()
  }
})
