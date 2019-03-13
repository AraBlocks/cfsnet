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

> INSERT WHITE PAPER/TECHNICAL DOCUMENT LINK HERE

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
* pkg-config (`brew install pkg-config` for Macos)

## Installation

```bash
$ npm install cfsnet
```

## Example

```js
const { createCFS } = require('cfsnet/create')
const id = 'my-file-system'
const cfs = await createCFS({ id })

// pipe file system events to stdout from `/var` partition
cfs.createReadStream('/var/log/events', { live: true }).pipe(process.stdout)

// write hello.txt to HOME
await cfs.writeFile('./hello.txt', 'world') // will write to /home/hello.txt

// read /home/hello.txt
const buffer = await cfs.readFile('./hello.txt') // will read ./hello.txt

// read HOME (~) directory
console.log(await cfs.readdir('~/hello.txt'))
```

## Contributing

* [Commit message format](/.github/COMMIT_FORMAT.md)
* [Commit message examples](/.github/COMMIT_FORMAT_EXAMPLES.md)
* [How to contribute](/.github/CONTRIBUTING.md)

## See Also

* [Hyperdrive][hyperdrive]
* [Hypercore][hypercore]
* [DAT][dat]

## License

MIT


[hyperdrive]: https://github.com/mafintosh/hyperdrive
[hypercore]: https://github.com/mafintosh/hypercore
[dat]: https://github.com/datproject/dat
