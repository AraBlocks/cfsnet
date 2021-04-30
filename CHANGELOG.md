# [0.20.0](https://github.com/arablocks/cfsnet/compare/0.19.3...0.20.0) (2021-04-30)



## [0.19.3](https://github.com/arablocks/cfsnet/compare/0.19.2...0.19.3) (2019-08-15)


### Features

* support extensions ([4f446f8](https://github.com/arablocks/cfsnet/commit/4f446f82b6eaa943734da85efe9d9327cc387137))



## [0.19.2](https://github.com/arablocks/cfsnet/compare/0.18.9...0.19.2) (2019-03-27)



## [0.18.9](https://github.com/arablocks/cfsnet/compare/0.18.8...0.18.9) (2019-03-13)



## [0.18.8](https://github.com/arablocks/cfsnet/compare/0.18.7...0.18.8) (2019-03-13)



## [0.18.7](https://github.com/arablocks/cfsnet/compare/0.18.5...0.18.7) (2019-03-08)


### Bug Fixes

* **fuse:** add datasync arg ([9dc656e](https://github.com/arablocks/cfsnet/commit/9dc656e5c3764dc2913ae40409f68a7fdb52c424))



## [0.18.5](https://github.com/arablocks/cfsnet/compare/0.18.4...0.18.5) (2019-03-08)


### Bug Fixes

* **mount-example:** mkdir -p './mnt/' only ([9286e23](https://github.com/arablocks/cfsnet/commit/9286e233cae9bc048085f5502aaf859eec769088))



## [0.18.4](https://github.com/arablocks/cfsnet/compare/0.18.3...0.18.4) (2019-03-08)


### Bug Fixes

* **fuse:** Use better aysnc exit hook ([0b5c310](https://github.com/arablocks/cfsnet/commit/0b5c3109c4cdf371781913eafef59d341590a311))



## [0.18.3](https://github.com/arablocks/cfsnet/compare/0.18.2...0.18.3) (2019-03-07)


### Bug Fixes

* **package.json:** forgot comma ([0132fc1](https://github.com/arablocks/cfsnet/commit/0132fc18329b56276f62f5e795c6d1b9391245a1))



## [0.18.2](https://github.com/arablocks/cfsnet/compare/0.18.0...0.18.2) (2019-03-07)


### Bug Fixes

* **create:** storeSecretKey passthru ([a13d78f](https://github.com/arablocks/cfsnet/commit/a13d78f759483328ebc5789089513567f719771b))
* **fuse.js:** Fix 'fsync' signature ([520544a](https://github.com/arablocks/cfsnet/commit/520544a39b4769d27cefedfe937a9b2ab5289423))



# [0.18.0](https://github.com/arablocks/cfsnet/compare/0.17.0...0.18.0) (2019-03-07)


### Bug Fixes

* **fuse:** Correctly compute size for writes ([f5a83f5](https://github.com/arablocks/cfsnet/commit/f5a83f5b858bf0d145df4435362a301543e0c1ad))


### Features

* **fuse:** Introduce fuse mount and full replication ([1d238c7](https://github.com/arablocks/cfsnet/commit/1d238c7fffbb66f6471df4727504fc70409cee71))



# [0.17.0](https://github.com/arablocks/cfsnet/compare/0.16.1...0.17.0) (2019-02-22)


### Bug Fixes

* **create.js:** Assign random ID if not given ([31abfa9](https://github.com/arablocks/cfsnet/commit/31abfa9d9107de41865d57d8b8ef1997e9138002))



## [0.16.1](https://github.com/arablocks/cfsnet/compare/0.16.0...0.16.1) (2019-02-22)


### Bug Fixes

* **create.js:** FIx path resolution when storage is a string ([53693cc](https://github.com/arablocks/cfsnet/commit/53693cc1935c03c03e524b9c1ef6d84c695a1638))



# [0.16.0](https://github.com/arablocks/cfsnet/compare/0.15.2...0.16.0) (2019-02-22)


### Features

* **create.js,drive.js:** Support 'storeSecretKey' switch ([0d1abf2](https://github.com/arablocks/cfsnet/commit/0d1abf2b48997be6a2432330778c5be156ab8cb7))



## [0.15.2](https://github.com/arablocks/cfsnet/compare/0.15.1...0.15.2) (2018-12-13)


### Bug Fixes

* **create:** pass latest option to hyperdrive ([9142814](https://github.com/arablocks/cfsnet/commit/91428142b2e6f523027e68ac647bd8a79611f47f))



## [0.15.1](https://github.com/arablocks/cfsnet/compare/0.15.0...0.15.1) (2018-12-05)



# [0.15.0](https://github.com/arablocks/cfsnet/compare/0.14.2...0.15.0) (2018-11-29)



## [0.14.2](https://github.com/arablocks/cfsnet/compare/0.14.0...0.14.2) (2018-11-29)


### Bug Fixes

* **create:** return null for version if no home partition ([732898e](https://github.com/arablocks/cfsnet/commit/732898eb31f38b22d20f037e27e8d542b0ef9a51))



# [0.14.0](https://github.com/arablocks/cfsnet/compare/0.13.0...0.14.0) (2018-11-19)


### Bug Fixes

* **create.js:** Correctly propagate version to cfs root ([f8410c2](https://github.com/arablocks/cfsnet/commit/f8410c2f85c4fbb73e027b81353816ace1aad451))



# [0.13.0](https://github.com/arablocks/cfsnet/compare/0.12.1...0.13.0) (2018-11-16)


### Bug Fixes

* **create:** allow readonly lstat and stat ([b933f1b](https://github.com/arablocks/cfsnet/commit/b933f1bd042adeb78dd16f499338f0a66f71d3be))
* **create.js:** Correctly create '/etc/cfs-signature' ([aa59a35](https://github.com/arablocks/cfsnet/commit/aa59a3513a7a31d609e53ea4c769b396d39f18bf))


### Features

* **crypto.js:** Export sign/verify functions from 'hypercore-crypto' ([c49f385](https://github.com/arablocks/cfsnet/commit/c49f3850ca3195e8df54c1e3bd9375664a30f6cd))



## [0.12.1](https://github.com/arablocks/cfsnet/compare/0.12.0...0.12.1) (2018-11-06)


### Bug Fixes

* **create:** Fix issues with partition regeneration ([045176e](https://github.com/arablocks/cfsnet/commit/045176e209b4f1542ea497fdeb1b76f0e69aa6f4))



# [0.12.0](https://github.com/arablocks/cfsnet/compare/0.11.1...0.12.0) (2018-11-05)


### Features

* **create.js:** Allow for configurable partitions in constructor ([57b397e](https://github.com/arablocks/cfsnet/commit/57b397e93f26325bf5e0ee4a9f5f80c5057f1cf6))



## [0.11.1](https://github.com/arablocks/cfsnet/compare/0.11.0...0.11.1) (2018-10-11)



# [0.11.0](https://github.com/arablocks/cfsnet/compare/0.10.3...0.11.0) (2018-09-18)



## [0.10.3](https://github.com/arablocks/cfsnet/compare/0.10.2...0.10.3) (2018-09-13)



## [0.10.2](https://github.com/arablocks/cfsnet/compare/0.10.1...0.10.2) (2018-09-13)


### Bug Fixes

* **create.js:** Fix hanging event flush in history ([788f5b7](https://github.com/arablocks/cfsnet/commit/788f5b70a7db8a84bc75d620a366450f84fb0d42))



## [0.10.1](https://github.com/arablocks/cfsnet/compare/0.10.0...0.10.1) (2018-09-13)


### Bug Fixes

* **create.js:** Fix broken 'partition.download()' call ([3ad7712](https://github.com/arablocks/cfsnet/commit/3ad77125a43a89b684f9e1309c279a5e7e615c21))



# [0.10.0](https://github.com/arablocks/cfsnet/compare/0.9.1...0.10.0) (2018-09-12)



## [0.9.1](https://github.com/arablocks/cfsnet/compare/0.9.0...0.9.1) (2018-09-09)



# [0.9.0](https://github.com/arablocks/cfsnet/compare/0.8.0...0.9.0) (2018-09-09)



# [0.8.0](https://github.com/arablocks/cfsnet/compare/0.7.0...0.8.0) (2018-09-09)



# [0.7.0](https://github.com/arablocks/cfsnet/compare/0.6.0...0.7.0) (2018-08-29)


### Features

* **create.js:** Store public key in '/etc/cfs-key' ([5d2f35d](https://github.com/arablocks/cfsnet/commit/5d2f35da1b200d6b8c24b43ca065cacca5d567ce))



# [0.6.0](https://github.com/arablocks/cfsnet/compare/0.5.3...0.6.0) (2018-08-29)


### Features

* **env.js:** Make module env variables dynamic ([e85190a](https://github.com/arablocks/cfsnet/commit/e85190a3df1e49490b7729411f2d90e636a16bae))



## [0.5.3](https://github.com/arablocks/cfsnet/compare/0.5.2...0.5.3) (2018-08-22)


### Bug Fixes

* **create:** added curlys ([d00004f](https://github.com/arablocks/cfsnet/commit/d00004f71c7cc641e90206de1503193cc351c876))
* **create:** corrected implementation of previous fix ([b0ed460](https://github.com/arablocks/cfsnet/commit/b0ed4605640924fc12c8edc3b8f419e13ff73c85))
* **create.js:** enabled opts for lstat/stat and fixes function signature which caused null callback. ([9a0bc1d](https://github.com/arablocks/cfsnet/commit/9a0bc1d15d3672065cbd9c3330f699debc6ecba1))



## [0.5.2](https://github.com/arablocks/cfsnet/compare/0.5.1...0.5.2) (2018-07-10)


### Bug Fixes

* Address PR notes re: readme ([9c4b12a](https://github.com/arablocks/cfsnet/commit/9c4b12a7c09002731229d194dfc9e20e63e934ed))
* Lint one line comment ([3fd3946](https://github.com/arablocks/cfsnet/commit/3fd394622ad85fbc2c884129b6b47cbc53dac81b))
* **proto/ops/AccessFile:** Add new to NotSupported ([55da9b9](https://github.com/arablocks/cfsnet/commit/55da9b9dd4348ee204562381a8b5841f3cbe62ad))
* **proto/ops/AccessFile:** Fix result encoding ([b074603](https://github.com/arablocks/cfsnet/commit/b0746039c7a21126a794aac1696bf8e1128e6595)), closes [#5](https://github.com/arablocks/cfsnet/issues/5)
* **proto/ops/Close:** Fix typo in Close ([2d726c6](https://github.com/arablocks/cfsnet/commit/2d726c66a2b957ebfa0bb69f0ee62533878493a5))
* **proto/ops/RemoveDirectory:** Fix ENOTEMPTY err ([4a4c8e6](https://github.com/arablocks/cfsnet/commit/4a4c8e6fc958c3cdc2d9300d8e141320f897b272)), closes [cfs-proto-server/#7](https://github.com/arablocks/cfsnet/issues/7)



## [0.5.1](https://github.com/arablocks/cfsnet/compare/0.5.0...0.5.1) (2018-06-02)



# [0.5.0](https://github.com/arablocks/cfsnet/compare/0.4.15...0.5.0) (2018-06-01)



## [0.4.15](https://github.com/arablocks/cfsnet/compare/0.4.14...0.4.15) (2018-06-01)



## [0.4.14](https://github.com/arablocks/cfsnet/compare/0.4.13...0.4.14) (2018-05-31)



## [0.4.13](https://github.com/arablocks/cfsnet/compare/0.4.12...0.4.13) (2018-05-29)


### Bug Fixes

* **create:** Fix issue with read callbacks ([578bfbb](https://github.com/arablocks/cfsnet/commit/578bfbb4a413c55e85e01a7cb7d23e7b01099112))
* **drive:** Fix issue with rmdir import ([48e8151](https://github.com/arablocks/cfsnet/commit/48e8151a67ca6d8cad1fe7297c7e47cf4a88688b))



## [0.4.12](https://github.com/arablocks/cfsnet/compare/0.4.11...0.4.12) (2018-05-14)



## [0.4.11](https://github.com/arablocks/cfsnet/compare/0.4.10...0.4.11) (2018-05-14)



## [0.4.10](https://github.com/arablocks/cfsnet/compare/0.4.9...0.4.10) (2018-05-14)



## [0.4.9](https://github.com/arablocks/cfsnet/compare/0.4.8...0.4.9) (2018-05-14)



## [0.4.8](https://github.com/arablocks/cfsnet/compare/0.4.7...0.4.8) (2018-05-13)



## [0.4.7](https://github.com/arablocks/cfsnet/compare/0.4.6...0.4.7) (2018-05-13)



## [0.4.6](https://github.com/arablocks/cfsnet/compare/0.4.5...0.4.6) (2018-05-11)



## [0.4.5](https://github.com/arablocks/cfsnet/compare/0.4.4...0.4.5) (2018-05-11)



## [0.4.4](https://github.com/arablocks/cfsnet/compare/0.4.3...0.4.4) (2018-05-11)



## [0.4.3](https://github.com/arablocks/cfsnet/compare/0.4.2...0.4.3) (2018-05-11)



## [0.4.2](https://github.com/arablocks/cfsnet/compare/0.4.1...0.4.2) (2018-05-09)



## [0.4.1](https://github.com/arablocks/cfsnet/compare/0.4.0...0.4.1) (2018-05-08)



# [0.4.0](https://github.com/arablocks/cfsnet/compare/0.3.2...0.4.0) (2018-05-08)



## [0.3.2](https://github.com/arablocks/cfsnet/compare/0.3.1...0.3.2) (2018-05-07)



## [0.3.1](https://github.com/arablocks/cfsnet/compare/0.3.0...0.3.1) (2018-05-04)



# [0.3.0](https://github.com/arablocks/cfsnet/compare/0.2.6...0.3.0) (2018-05-04)


### Features

* **swarm2:** Introduce Swarm2 API (Multiplexed TCP<>WS) ([92798de](https://github.com/arablocks/cfsnet/commit/92798defb93294f99f4d1df6519c33aefc2d6884))



## [0.2.6](https://github.com/arablocks/cfsnet/compare/0.2.5...0.2.6) (2018-04-24)



## [0.2.5](https://github.com/arablocks/cfsnet/compare/0.2.4...0.2.5) (2018-04-24)



## [0.2.4](https://github.com/arablocks/cfsnet/compare/0.2.3...0.2.4) (2018-04-24)



## [0.2.3](https://github.com/arablocks/cfsnet/compare/0.2.2...0.2.3) (2018-04-24)



## [0.2.2](https://github.com/arablocks/cfsnet/compare/0.2.1...0.2.2) (2018-04-23)



## [0.2.1](https://github.com/arablocks/cfsnet/compare/0.2.0...0.2.1) (2018-04-23)



# [0.2.0](https://github.com/arablocks/cfsnet/compare/0.1.3...0.2.0) (2018-04-23)


### Features

* **swarm:** Allow all partitions to be discovered ([a4bed70](https://github.com/arablocks/cfsnet/commit/a4bed70a00742fb0da60e0755fe714e9a8ad520c))



## [0.1.3](https://github.com/arablocks/cfsnet/compare/0.1.2...0.1.3) (2018-04-12)



## [0.1.2](https://github.com/arablocks/cfsnet/compare/0.1.1...0.1.2) (2018-04-11)


### Bug Fixes

* **create.js:** Fix missing revision argument ([41493ff](https://github.com/arablocks/cfsnet/commit/41493ffd1807e6630cfebc9697ac4569c67acb82))
* **remote.js:** Fix HTTP method for SYNC call ([7e615d0](https://github.com/arablocks/cfsnet/commit/7e615d0950c749d0ad2e33a48c080012d8e8e966))



## [0.1.1](https://github.com/arablocks/cfsnet/compare/0.1.0...0.1.1) (2018-04-10)


### Bug Fixes

* **package.json:** Fix broken dependency location ([c286031](https://github.com/arablocks/cfsnet/commit/c286031494dab45ed9317f73bf83882b6edb753f))



# 0.1.0 (2018-04-10)



