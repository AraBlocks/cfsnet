'use strict'

const WebSocketServer = require('simple-websocket/server')
const WebSocket = require('simple-websocket')
const Socket = require('ws')

function createCFSWebSocketServer(opts) {
  const server = new WebSocketServer(opts)
  return server
}

function createCFSWebSocket({host, headers}) {
  const socket = new WebSocket({
    socket: new Socket(host, {headers})
  })
  return socket
}

function createCFSWebSocketStream({socket}) {
  const stream = new WebSocket({socket})
  stream._onOpen()
  stream.upgradeReq = socket.upgradeReq
  return stream
}

module.exports = {
  createCFSWebSocketServer,
  createCFSWebSocketStream,
  createCFSWebSocket,
}
