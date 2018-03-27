'use strict'

const WebSocketServer = require('simple-websocket/server')
const WebSocket = require('simple-websocket')

async function createCFSWebSocketServer({
  port = 0
}) {
  const server = new WebSocketServer({port})
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
