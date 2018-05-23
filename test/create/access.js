const { existsSync } = require('fs')
const constants = require('../../constants')
const { createCFS } = require('../../create')
const { test } = require('ava')
const rimraf = require('rimraf')
const sinon = require('sinon')

test.cb.after(t => {
  t.plan(0)

  rimraf('./.cfses', t.end)
})

test('W_OK access fails when CFS closed', async t => {
  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  cfs.partitions.home.metadata.writable = false

  try {
    await cfs.access('test', constants.W_OK)
    t.fail()
  } catch (e) {
    t.pass()
  }
})

test('R_OK access fails when CFS closed', async t => {
  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  cfs.partitions.home.metadata.readable = false

  try {
    await cfs.access('test', constants.R_OK)
    t.fail()
  } catch (e) {
    t.pass()
  }
})

test('F_OK access fails when CFS closed', async t => {
  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  cfs.partitions.home.metadata.writable = false

  try {
    await cfs.access('test', constants.F_OK)
    t.fail()
  } catch (e) {
    t.pass()
  }
})

test('W_OK access passes', async t => {
  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  try {
    await cfs.access('/var', constants.W_OK)
    t.pass()
  } catch (e) {
    console.log("FAIL:", e)
    t.fail()
  }
})

test('R_OK access passes', async t => {
  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  try {
    await cfs.access('/var', constants.R_OK)
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('F_OK access passes', async t => {
  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  try {
    await cfs.access('/var', constants.F_OK)
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('F_OK access implicitly checked', async t => {
  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  const spy = sinon.spy(cfs.partitions.var, 'access')

  try {
    await cfs.access('/var')
    t.true(spy.called)
  } catch (e) {
    t.fail()
  }
})
