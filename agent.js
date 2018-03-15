'use strict'

const { parse, resolve: resolveURL } = require('url')
const debug = require('debug')('littlstar:cfs:agent')
const agent = require('superagent')

const kHTTPProtocol = 'http:'
const kHTTPSProtocol = 'https:'

const kDefaultHTTPPort = 80
const kDefaultHTTSPPort = 443
const kDefaultHTTPProtocol = kHTTPProtocol

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
    if (port) {
      this.port = port
    } else if (kHTTPSProtocol == this.protocol) {
      this.port = kDefaultHTTSPPort
    } else {
      this.port = kDefaultHTTPPort
    }
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
    if (!method || 'string' != typeof method) {
      throw new TypeError("CFSNetworkAgent.request(): Expecting method to be a string")
    }
    if (!uri || 'string' != typeof uri) {
      throw new TypeError("CFSNetworkAgent.request(): Expecting uri to be a string")
    }
    // normalize method to an actual usable "superagent" module method name
    method = method.toLowerCase()
    return new Promise((resolve, reject) => {
      // normalize URI into a URL suitable for a request
      // the protocol, hostname, and port are prefixed to URI
      // paths that begin with `/`, otherwise the URI is treated
      // as the URL to the request
      let url = uri
      if ('/' == uri[0]) {
        url = resolveURL(`${this.protocol}//${this.host}`, uri)
      }

      // create and configure request based on input
      debug("Creating %s request to %s", method.toUpperCase(), url)
      const request = agent[method](url)
      if (data) { request.send(data) }
      if (retry) { request.retry(retry) }
      if (query) { request.query(query) }
      if (headers) { request.set(headers) }

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
