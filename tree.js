'use strict'

const directories = [
  '/',
  '/root',
  '/home',
  '/etc',
  '/lib',
  '/tmp',
  '/var',
  '/var/log',
  '/var/cache',
]

const files = [
  '/etc/cfs-id',
  '/etc/cfs-epoch',
  '/var/log/events',
]

module.exports = {
  directories,
  files,
}
