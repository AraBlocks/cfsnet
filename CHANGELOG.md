## [0.18.9](https://github.com/AraBlocks/cfsnet/compare/0.18.8...0.18.9) (2019-03-13)



## [0.18.8](https://github.com/AraBlocks/cfsnet/compare/0.18.7...0.18.8) (2019-03-13)



## [0.18.7](https://github.com/AraBlocks/cfsnet/compare/0.18.5...0.18.7) (2019-03-08)


### Bug Fixes

* **fuse:** add datasync arg ([9dc656e](https://github.com/AraBlocks/cfsnet/commit/9dc656e))



## [0.18.5](https://github.com/AraBlocks/cfsnet/compare/0.18.4...0.18.5) (2019-03-08)


### Bug Fixes

* **mount-example:** mkdir -p './mnt/' only ([9286e23](https://github.com/AraBlocks/cfsnet/commit/9286e23))



## [0.18.4](https://github.com/AraBlocks/cfsnet/compare/0.18.2...0.18.4) (2019-03-08)


### Bug Fixes

* **fuse:** Use better aysnc exit hook ([0b5c310](https://github.com/AraBlocks/cfsnet/commit/0b5c310))
* **package.json:** forgot comma ([0132fc1](https://github.com/AraBlocks/cfsnet/commit/0132fc1))



## [0.18.2](https://github.com/AraBlocks/cfsnet/compare/0.18.0...0.18.2) (2019-03-07)


### Bug Fixes

* **create:** storeSecretKey passthru ([a13d78f](https://github.com/AraBlocks/cfsnet/commit/a13d78f))
* **fuse.js:** Fix 'fsync' signature ([520544a](https://github.com/AraBlocks/cfsnet/commit/520544a))



# [0.18.0](https://github.com/AraBlocks/cfsnet/compare/0.17.0...0.18.0) (2019-03-07)


### Bug Fixes

* **fuse:** Correctly compute size for writes ([f5a83f5](https://github.com/AraBlocks/cfsnet/commit/f5a83f5))


### Features

* **fuse:** Introduce fuse mount and full replication ([1d238c7](https://github.com/AraBlocks/cfsnet/commit/1d238c7))



# [0.17.0](https://github.com/AraBlocks/cfsnet/compare/0.16.1...0.17.0) (2019-02-22)


### Bug Fixes

* **create.js:** Assign random ID if not given ([31abfa9](https://github.com/AraBlocks/cfsnet/commit/31abfa9))



## [0.16.1](https://github.com/AraBlocks/cfsnet/compare/0.16.0...0.16.1) (2019-02-22)


### Bug Fixes

* **create.js:** FIx path resolution when storage is a string ([53693cc](https://github.com/AraBlocks/cfsnet/commit/53693cc))



# [0.16.0](https://github.com/AraBlocks/cfsnet/compare/0.15.2...0.16.0) (2019-02-22)


### Features

* **create.js,drive.js:** Support 'storeSecretKey' switch ([0d1abf2](https://github.com/AraBlocks/cfsnet/commit/0d1abf2))



## [0.15.2](https://github.com/AraBlocks/cfsnet/compare/0.15.1...0.15.2) (2018-12-13)


### Bug Fixes

* **create:** pass latest option to hyperdrive ([9142814](https://github.com/AraBlocks/cfsnet/commit/9142814))



## [0.15.1](https://github.com/AraBlocks/cfsnet/compare/0.15.0...0.15.1) (2018-12-05)



# [0.15.0](https://github.com/AraBlocks/cfsnet/compare/0.14.2...0.15.0) (2018-11-29)



## [0.14.2](https://github.com/AraBlocks/cfsnet/compare/0.14.0...0.14.2) (2018-11-29)


### Bug Fixes

* **create:** return null for version if no home partition ([732898e](https://github.com/AraBlocks/cfsnet/commit/732898e))



# [0.14.0](https://github.com/AraBlocks/cfsnet/compare/0.13.0...0.14.0) (2018-11-19)


### Bug Fixes

* **create.js:** Correctly propagate version to cfs root ([f8410c2](https://github.com/AraBlocks/cfsnet/commit/f8410c2))



# [0.13.0](https://github.com/AraBlocks/cfsnet/compare/0.12.1...0.13.0) (2018-11-16)


### Bug Fixes

* **create:** allow readonly lstat and stat ([b933f1b](https://github.com/AraBlocks/cfsnet/commit/b933f1b))
* **create.js:** Correctly create '/etc/cfs-signature' ([aa59a35](https://github.com/AraBlocks/cfsnet/commit/aa59a35))


### Features

* **crypto.js:** Export sign/verify functions from 'hypercore-crypto' ([c49f385](https://github.com/AraBlocks/cfsnet/commit/c49f385))



## [0.12.1](https://github.com/AraBlocks/cfsnet/compare/0.12.0...0.12.1) (2018-11-06)


### Bug Fixes

* **create:** Fix issues with partition regeneration ([045176e](https://github.com/AraBlocks/cfsnet/commit/045176e))



# [0.12.0](https://github.com/AraBlocks/cfsnet/compare/0.11.1...0.12.0) (2018-11-05)


### Features

* **create.js:** Allow for configurable partitions in constructor ([57b397e](https://github.com/AraBlocks/cfsnet/commit/57b397e))



## [0.11.1](https://github.com/AraBlocks/cfsnet/compare/0.11.0...0.11.1) (2018-10-11)



# [0.11.0](https://github.com/AraBlocks/cfsnet/compare/0.10.3...0.11.0) (2018-09-18)



## [0.10.3](https://github.com/AraBlocks/cfsnet/compare/0.10.2...0.10.3) (2018-09-13)



## [0.10.2](https://github.com/AraBlocks/cfsnet/compare/0.10.1...0.10.2) (2018-09-13)


### Bug Fixes

* **create.js:** Fix hanging event flush in history ([788f5b7](https://github.com/AraBlocks/cfsnet/commit/788f5b7))



## [0.10.1](https://github.com/AraBlocks/cfsnet/compare/0.10.0...0.10.1) (2018-09-13)


### Bug Fixes

* **create.js:** Fix broken 'partition.download()' call ([3ad7712](https://github.com/AraBlocks/cfsnet/commit/3ad7712))



# [0.10.0](https://github.com/AraBlocks/cfsnet/compare/0.9.1...0.10.0) (2018-09-12)



## [0.9.1](https://github.com/AraBlocks/cfsnet/compare/0.9.0...0.9.1) (2018-09-09)



# [0.9.0](https://github.com/AraBlocks/cfsnet/compare/0.8.0...0.9.0) (2018-09-09)



# [0.8.0](https://github.com/AraBlocks/cfsnet/compare/0.7.0...0.8.0) (2018-09-09)



# [0.7.0](https://github.com/AraBlocks/cfsnet/compare/0.6.0...0.7.0) (2018-08-29)


### Features

* **create.js:** Store public key in '/etc/cfs-key' ([5d2f35d](https://github.com/AraBlocks/cfsnet/commit/5d2f35d))



# [0.6.0](https://github.com/AraBlocks/cfsnet/compare/0.5.3...0.6.0) (2018-08-29)


### Features

* **env.js:** Make module env variables dynamic ([e85190a](https://github.com/AraBlocks/cfsnet/commit/e85190a))



## [0.5.3](https://github.com/AraBlocks/cfsnet/compare/0.5.2...0.5.3) (2018-08-22)


### Bug Fixes

* **create:** added curlys ([d00004f](https://github.com/AraBlocks/cfsnet/commit/d00004f))
* **create:** corrected implementation of previous fix ([b0ed460](https://github.com/AraBlocks/cfsnet/commit/b0ed460))
* **create.js:** enabled opts for lstat/stat and fixes function signature which caused null callback. ([9a0bc1d](https://github.com/AraBlocks/cfsnet/commit/9a0bc1d))



## [0.5.2](https://github.com/AraBlocks/cfsnet/compare/0.5.1...0.5.2) (2018-07-10)


### Bug Fixes

* **proto/ops/AccessFile:** Add new to NotSupported ([55da9b9](https://github.com/AraBlocks/cfsnet/commit/55da9b9))
* **proto/ops/AccessFile:** Fix result encoding ([b074603](https://github.com/AraBlocks/cfsnet/commit/b074603)), closes [#5](https://github.com/AraBlocks/cfsnet/issues/5)
* **proto/ops/Close:** Fix typo in Close ([2d726c6](https://github.com/AraBlocks/cfsnet/commit/2d726c6))
* **proto/ops/RemoveDirectory:** Fix ENOTEMPTY err ([4a4c8e6](https://github.com/AraBlocks/cfsnet/commit/4a4c8e6)), closes [cfs-proto-server/#7](https://github.com/AraBlocks/cfsnet/issues/7)
* Address PR notes re: readme ([9c4b12a](https://github.com/AraBlocks/cfsnet/commit/9c4b12a))
* Lint one line comment ([3fd3946](https://github.com/AraBlocks/cfsnet/commit/3fd3946))



## [0.5.1](https://github.com/AraBlocks/cfsnet/compare/0.5.0...0.5.1) (2018-06-02)



# [0.5.0](https://github.com/AraBlocks/cfsnet/compare/0.4.15...0.5.0) (2018-06-01)



## [0.4.15](https://github.com/AraBlocks/cfsnet/compare/0.4.14...0.4.15) (2018-06-01)



## [0.4.14](https://github.com/AraBlocks/cfsnet/compare/0.4.13...0.4.14) (2018-05-31)



## [0.4.13](https://github.com/AraBlocks/cfsnet/compare/0.4.12...0.4.13) (2018-05-29)


### Bug Fixes

* **create:** Fix issue with read callbacks ([578bfbb](https://github.com/AraBlocks/cfsnet/commit/578bfbb))
* **drive:** Fix issue with rmdir import ([48e8151](https://github.com/AraBlocks/cfsnet/commit/48e8151))



## [0.4.12](https://github.com/AraBlocks/cfsnet/compare/0.4.11...0.4.12) (2018-05-14)



## [0.4.11](https://github.com/AraBlocks/cfsnet/compare/0.4.10...0.4.11) (2018-05-14)



## [0.4.10](https://github.com/AraBlocks/cfsnet/compare/0.4.9...0.4.10) (2018-05-14)



## [0.4.9](https://github.com/AraBlocks/cfsnet/compare/0.4.8...0.4.9) (2018-05-14)



## [0.4.8](https://github.com/AraBlocks/cfsnet/compare/0.4.7...0.4.8) (2018-05-13)



## [0.4.7](https://github.com/AraBlocks/cfsnet/compare/0.4.6...0.4.7) (2018-05-13)



## [0.4.6](https://github.com/AraBlocks/cfsnet/compare/0.4.5...0.4.6) (2018-05-11)



## [0.4.5](https://github.com/AraBlocks/cfsnet/compare/0.4.4...0.4.5) (2018-05-11)



## [0.4.4](https://github.com/AraBlocks/cfsnet/compare/0.4.3...0.4.4) (2018-05-11)



## [0.4.3](https://github.com/AraBlocks/cfsnet/compare/0.4.2...0.4.3) (2018-05-11)



## [0.4.2](https://github.com/AraBlocks/cfsnet/compare/0.4.1...0.4.2) (2018-05-09)



## [0.4.1](https://github.com/AraBlocks/cfsnet/compare/0.4.0...0.4.1) (2018-05-08)



# [0.4.0](https://github.com/AraBlocks/cfsnet/compare/0.3.2...0.4.0) (2018-05-08)



## [0.3.2](https://github.com/AraBlocks/cfsnet/compare/0.3.1...0.3.2) (2018-05-07)



## [0.3.1](https://github.com/AraBlocks/cfsnet/compare/0.3.0...0.3.1) (2018-05-04)



# [0.3.0](https://github.com/AraBlocks/cfsnet/compare/0.2.6...0.3.0) (2018-05-04)


### Features

* **swarm2:** Introduce Swarm2 API (Multiplexed TCP<>WS) ([92798de](https://github.com/AraBlocks/cfsnet/commit/92798de))



## [0.2.6](https://github.com/AraBlocks/cfsnet/compare/0.2.5...0.2.6) (2018-04-24)



## [0.2.5](https://github.com/AraBlocks/cfsnet/compare/0.2.4...0.2.5) (2018-04-24)



## [0.2.4](https://github.com/AraBlocks/cfsnet/compare/0.2.3...0.2.4) (2018-04-24)



## [0.2.3](https://github.com/AraBlocks/cfsnet/compare/0.2.2...0.2.3) (2018-04-24)



## [0.2.2](https://github.com/AraBlocks/cfsnet/compare/0.2.1...0.2.2) (2018-04-23)



## [0.2.1](https://github.com/AraBlocks/cfsnet/compare/0.2.0...0.2.1) (2018-04-23)



# [0.2.0](https://github.com/AraBlocks/cfsnet/compare/0.1.3...0.2.0) (2018-04-23)


### Features

* **swarm:** Allow all partitions to be discovered ([a4bed70](https://github.com/AraBlocks/cfsnet/commit/a4bed70))



## [0.1.3](https://github.com/AraBlocks/cfsnet/compare/0.1.2...0.1.3) (2018-04-12)



## [0.1.2](https://github.com/AraBlocks/cfsnet/compare/0.1.1...0.1.2) (2018-04-11)


### Bug Fixes

* **create.js:** Fix missing revision argument ([41493ff](https://github.com/AraBlocks/cfsnet/commit/41493ff))
* **remote.js:** Fix HTTP method for SYNC call ([7e615d0](https://github.com/AraBlocks/cfsnet/commit/7e615d0))



## [0.1.1](https://github.com/AraBlocks/cfsnet/compare/0.1.0...0.1.1) (2018-04-10)


### Bug Fixes

* **package.json:** Fix broken dependency location ([c286031](https://github.com/AraBlocks/cfsnet/commit/c286031))



# 0.1.0 (2018-04-10)



