const { createCFS } = require('../../create')
const { resolve } = require('path')
const rimraf = require('rimraf')
const env = require('../../env')
const pify = require('pify')
const test = require('ava')
const fs = require('fs')

test('env.CFS_ROOT_DIR accessor', async (t) => {
  const dir = resolve(__dirname, 'test-directory')
  await pify(rimraf)(dir)

  env.CFS_ROOT_DIR = dir

  t.true(dir === env.CFS_ROOT_DIR)

  await createCFS({ id: 'test' })
  await t.notThrows(pify(fs.access)(dir))
  await pify(rimraf)(dir)
})
