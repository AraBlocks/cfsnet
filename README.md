CFSNet
======

[![Build Status](https://travis-ci.com/AraBlocks/cfsnet.svg?token=6WjTyCg41y8MBmCzro5x&branch=master)](https://travis-ci.com/AraBlocks/cfsnet)

The Conflict-Free File System Network, or CFSNet, is a distributed,
decentralized, and peer-to-peer system for securely authoring, tracking,
and replicating content in self contained file system archives. This is
some what equivalent to how Linux file systems are distributed through Docker
containers and how the `POSIX.1-1988` Tar file format represents archive files
as binary objects (Tarballs).

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
const cfs = await createCFS({ id, key })
```

## Example
*Create and write to a CFS*:
```js
const { createCFS } = require('cfsnet/create')

const seed = crypto.blake2b(Buffer.from('Hi Mom!'))
const keyPair= crypto.generateKeyPair(seed)

const key = keyPair.publicKey
const secret = keyPair.secretKey
const id = 'cfs/directory'

const cfs
try {
  cfs = await createCFS({ id, key })
} catch(e) {
  console.error("Opps, there was an error creating the CFS: ", e)
}

cfs.createWriteStream(`${cfs.HOME}/newFile`)
```

*Create a swarm and read from a CFS*:
```js
const { createCFSDiscoverySwarm } = require('cfsnet/swarm')

const swarm = await createCFSDiscoverySwarm({
  id, key, cfs
})

```

## API
TODOs
### `CFSNetworkAgent`
Parse hostname as URL format and derive protocol, port, and hostname
- `hostname`: protocol and URL ie, https://arablocks.io
- `port`: Port to listen on ie, 8000
### `createCFSDirectories`
This function creates the root CFS directories. The directory structure is very similar to a Linux filesystem, or FHS (Filesystem Hierarchy Standard).
```
/ - The root of the CFS
├── /home - Contains directories of groups containing directories of users
│   ├── /<group> - Group level hierarchy
│   └── /<group>/<user> - User level hierarchy with personal settings and configuration
├── /lib - Libraries essential to the user
├── /tmp - Temporary files
├── /var - Contains file that change often
├── /var/log - Contains log files for events that occur on the CFS
└── /var/cache - Contains cached files
```
### `createCFSFiles`
TODO
### `createCFS`
TODO
- `id`: id of CFS; defa   ult is `null`
- `key`: public key of CFS; default is `null`
- `path`: TODO; default is `null`
- `latest`: TODO; default is `false`
- `sparse`: TODO; default is `false`
- `shallow`: TODO; default is `false`
- `storage`: TODO; default is `null`
- `revision`: TODO; default is `null`
- `secretKey`: TODO; default is `null`
- `eventStream`: TODO; default is `true`
- `sparseMetadata`: TODO; default is `false`
### `destroyCFS`
This function will attempt to destroy a CFS based on some input identifier.  The CFS key path is derived from the input identifier.  The entire drive is removed, closed, purged from disk, and removed from the shared CFS drive map.
- `id`: TODO; default is `null`
- `cfs`: TODO; default is `null`
- `key`: TODO; default is `null`
- `path`: TODO; default is `null`
- `autoClose`: TODO; default is `true`
- `destroyPath`: TODO; default is `false`
### `CFSRemote`
Extends CFSNetworkAgent.  Handles requests to CFS, including headers.
Constants:
- `kCFSRevisionHeader` = 'x-cfs-revision'
- `kCFSKeyHeader` = 'x-cfs-key'
- `kCFSIDHeader` = 'x-cfs-id'
### `createReadStream`
TODO
### `sanitizeS3URL`
TODO
### `parseS3URL`
TODO
### `open`
TODO
### `stat`
TODO
### `createCFSSignalHub`
TODO
- opts object:
  - `discoveryKey`: TODO
  - `urls`: TODO
### `createCFSDiscoverySwarm`
Creates a CFS discovery network swarm for specified partition.
- `maxConnections`: TODO; default is `60`
- `signalhub`: TODO; default is `null`
- `partition`: TODO; default is `'home'`
- `download`: TODO; default is `true`
- `upload`: TODO; default is `true`
- `live`: TODO; default is `true`
- `port`: TODO; default is `0`
- `wrtc`: optional WebRTC implementation for node; default is `null`
- `dns`: TODO; default is `{},`
- `dht`: TODO; default is `{},`
- `cfs`: TODO; default is `null`
- `key`: TODO; default is `null`
- `id`: TODO; default is `null`
- `ws`: TODO; default is `{bootstrap: null, port: 0 }`
### `createCFSWebSocketServer`
Create a websocket server.
- `opts`: WebSocket options
### `createCFSWebSocketStream`
Create a websocket stream.
- `socket`: The websocket from which to create a stream.
### `createCFSWebSocket`
Create a websocket.
- opts object:
  - `host`: TODO
  - `headers`: object containing socket headers

## Contributing
- [Commit message format](/.github/COMMIT_FORMAT.md)
- [Commit message examples](/.github/COMMIT_FORMAT_EXAMPLES.md)
- [How to contribute](/.github/CONTRIBUTING.md)

## See Also
- [CFSNet Command Line Interface](https://github.com/arablocks/cfs-cli)

## License
LGPL-3.0
