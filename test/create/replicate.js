const { existsSync } = require('fs')
const constants = require('../../constants')
const { createCFS } = require('../../create')
const { test } = require('ava')
const rimraf = require('rimraf')
const sinon = require('sinon')

test.cb.after(t => {
  t.plan(0)

  rimraf('.cfses', t.end)
})

test('replicate is called without errors', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  sinon.stub(cfs.partitions, 'resolve').callsFake((name) => {
    t.is('/', name)
    return cfs.partitions.home
  })

  try {
    await cfs.replicate('/')
  } catch (e) {
    t.fail(e)
  }
})

test('replicate works without defining partition name and opts', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  sinon.stub(cfs.partitions, 'resolve').callsFake((name) => {
    t.is(cfs.HOME, name)
    return cfs.partitions.home
  })

  cfs.replicate({})
})


test('replicate works without defining partition name', async t => {
  t.plan(1)

  let cfs = await createCFS({
    path: `./.cfses/${Math.random()}`
  })

  sinon.stub(cfs.partitions, 'resolve').callsFake((name) => {
    t.is(cfs.HOME, name)
    return cfs.partitions.home
  })

  cfs.replicate()
})
