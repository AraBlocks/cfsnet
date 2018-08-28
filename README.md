CFSNET
======

[![Build Status](https://travis-ci.com/AraBlocks/cfsnet.svg?token=6WjTyCg41y8MBmCzro5x&branch=master)](https://travis-ci.com/AraBlocks/cfsnet)

## Abtract

The Conflict-Free File System Network, or CFSNET, is a distributed,
decentralized, and peer-to-peer system for securely authoring, tracking,
and replicating content in self contained file system archives. This is
some what equivalent to how Linux file systems are distributed through Docker
containers and how the `POSIX.1-1988` Tar file format represents archive files
as binary objects (Tarballs).

> INSERT WHITE PAPER LINK HERE

## Summary

_CFSNET_ creates a partitioned unix like filesystem broken up into smaller
[Hyperdrive](https://github.com/mafintosh/hyperdrive) instances.
Operations on file paths resolve to the correct partition (`/home` vs
`/etc`). All methods return a promise and accept a callback style
function.

## Status

This project is in active Beta development.

## Dependencies

- [Node](https://nodejs.org/en/download/)

## Installation

```bash
$ npm install littlstar/cfsnet
```

#### Usage

```js
const { createCFS } = require('cfsnet/create')
const cfs = await createCFS({ id, key })
```

## Example

```js
// TODO
```

## API

### `cfs = await createCFS(opts)`

Returns a 


## Contributing
- [Commit message format](/.github/COMMIT_FORMAT.md)
- [Commit message examples](/.github/COMMIT_FORMAT_EXAMPLES.md)
- [How to contribute](/.github/CONTRIBUTING.md)

## See Also
- [CFSNET Command Line Interface](https://github.com/arablocks/cfs-cli)

## License
LGPL-3.0
