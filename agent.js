'use strict'

const { parse } = require('url')
const { join } = require('path')
const agent = require('superagent')

const kDefaultHTTPPort = 80
const kDefaultHTTPProtocol = 'https:'

class CFSNetworkAgent {
  constructor(hostname, port) {
    // parse hostname as URL format and derive protocol,
    // port, and hostname
    if (/https?:/.test(hostname)) {
      const parsed = parse(hostname)
      hostname = parsed.hostname
      this.protocol = parsed.protocol
      // set port derived from parsed hostname if port not
      // explicitly given as second argument
      if (parsed.port && !port) {
        port = parsed.port
      }
    } else {
      this.protocol = kDefaultHTTPProtocol
    }

    this.hostname = hostname
    this.port = port || kDefaultHTTPPort
  }

  get host() {
    return `${this.hostname}:${this.port}`
  }

  get href() {
    return `${this.protocol}//${this.host}`
  }

  async head(opts) {
    return this.request(Object.assign({method: 'HEAD'}, opts))
  }

  async get(opts) {
    return this.request(Object.assign({method: 'GET'}, opts))
  }

  async post(opts) {
    return this.request(Object.assign({method: 'POST'}, opts))
  }

  async put(opts) {
    return this.request(Object.assign({method: 'PUT'}, opts))
  }

  async del(opts) {
    return this.request(Object.assign({method: 'DELETE'}, opts))
  }

  async request({method, uri, data, retry, headers, query}) {
    // normalize method to an actual usable "superagent" module method name
    method = method.toLowerCase()
    return new Promise((resolve, reject) => {
      // normalize URI into a URL suitable for a request
      // the protocol, hostname, and port are prefixed to URI
      // paths that begin with `/`, otherwise the URI is treated
      // as the URL to the request
      const url = '/' == uri[0] ? join(this.href, uri) : uri
      const request = agent[method](url)

      // configure request based on input
      if (data) { request.send(data) }
      if (query) { requeset.query(query) }
      if (headers) { request.set(headers) }
      if (retry) { request.retry(retry) }

      // make actual request and resolve or reject response
      // for promise returned by the function
      request.end((err, res) => {
        if (err) { reject(err) }
        else { resolve(res) }
      })
    })
  }
}

module.exports = {
  CFSNetworkAgent
}
