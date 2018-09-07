CFSNET
======

[![Build Status](https://travis-ci.com/AraBlocks/cfsnet.svg?token=6WjTyCg41y8MBmCzro5x&branch=master)](https://travis-ci.com/AraBlocks/cfsnet)

## Abstract

The Conflict-Free File System Network, or _CFSNET_, is a distributed,
decentralized, and peer-to-peer system for securely authoring, tracking,
and replicating content in self contained file system archives. This is
some what equivalent to how Linux file systems are distributed through Docker
containers and how the `POSIX.1-1988` Tar file format represents archive files
as binary objects (Tarballs).

> INSERT WHITE PAPER LINK HERE

## Summary

_CFSNET_ creates a UNIX like file system implementing a subset of the
_Filesystem Hierarchy Standard_. _CFSNET_ file systems are partitioned into
smaller [Hyperdrive][hyperdrive] instances.

CFSNET builds on [Hyperdrive][hyperdrive] in similar ways [Dat][dat] has
built on it, but _CFSNET_ overlays a _POSIX_ like file system that is
partitioned into distinct Hyperdrive file systems that can be replicated
independently.  The API is consistent with [Hyperdrive][hyperdrive] while
exposing a _Promise_ based API as well.

## Status

This project is in _active_ development.

## Dependencies

* [Node](https://nodejs.org/en/download/)

## Installation

```bash
$ npm install littlstar/cfsnet
```

## Usage

```js
const { createCFS } = require('cfsnet/create')
const { destroyCFS } = require('cfsnet/destroy')
const { createCFSDiscoverySwarm } = require('cfsnet/swarm')
```

## Example

```js`
const id = 'my-file-system'
const cfs = await createCFS({ id })

// pipe file system events to stdout from `/var` partition
cfs.createReadStream('/var/log/events', { live: true }).pipe(process.stdout)

// write hello.txt to HOME
await cfs.writeFile('./hello.txt', 'world') // will write to /home/hello.txt

// read /home/hello.txt
const buffer = await cfs.readFile('./hello.txt') // will read ./hello.txt

// read HOME (~) directory
console.log(await cfs.readdir('~'))
```

## API

### `cfs = await createCFS(opts)`

TODO

### `destroyed = await destroyCFS(opts)`

TODO

### `swarm = await createCFSDiscoverySwarm(opts)`

TODO

### `path = await createCFSKeyPath(opts)`

TODO

### `server = await createCFSWebSocketServer(opts)`

TODO

### `stream = await createCFSWebSocketStream(opts)`

TODO

### `socket = await createCFSWebSocket(opts)`

TODO

## Contributing

* [Commit message format](/.github/COMMIT_FORMAT.md)
* [Commit message examples](/.github/COMMIT_FORMAT_EXAMPLES.md)
* [How to contribute](/.github/CONTRIBUTING.md)

## See Also

* [Hyperdrive][hyperdrive]
* [Hypercore][hypercore]
* [DAT][dat]

## License

LGPL-3.0


[hyperdrive]: https://github.com/orgs/AraBlocks/teams/audit/members
[dat]: TODO
