'use strict'

const { createCFSDiscoverySwarm } = require('../../swarm')
const { createCFS } = require('../../create')
const VideoStream = require('videostream')
const shaka = require('shaka-player')
const debug = require('debug')('littlstar:cfs:example')
const morph = require('nanomorph')
const html = require('nanohtml')
const ram = require('random-access-memory')
const qs = require('querystring')

void async function main() {
  const {
    file = 'video.mp4',
    key = null,
    id = 'werle/werle',
  } = qs.parse(window.location.search.slice(1))

  const URL = window.URL || window.webkitURL
  const cfs = await createCFS({storage: ram, key, id})
  const swarm = await createCFSDiscoverySwarm({id, key, cfs})
  const video = html`
    <video controls autoplay preload
      style="width: 100%; display: block; height: 100%; position: absolute; top: 0; left: 0;"
    />`

  video.oncanplay = () => video.play()
  cfs.metadata.update(onupdate)

  document.body.appendChild(video)

  console.log(id, cfs.key.toString('hex'));

  window.video = video
  window.swarm = swarm
  window.cfs = cfs

  function onupdate() {
    console.log('onupdate');
    const stream = new VideoStream({createReadStream}, video)
    window.stream = stream
  }

  function createReadStream(range) {
    return cfs.createReadStream(`${cfs.HOME}/${file}`, range)
  }

}()
