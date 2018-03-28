'use strict'

const WebSocketServer = require('simple-websocket/server')
const WebSocket = require('simple-websocket')

async function createCFSWebSocketServer(opts) {
  const server = new WebSocketServer(opts)
  return server
}

async function createCFSWebSocket({host}) {
  const socket = new WebSocket(host)
  return socket
}

module.exports = {
  createCFSWebSocketServer,
  createCFSWebSocket,
}
