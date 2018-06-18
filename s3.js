const S3ReadableStream = require('s3-readable-stream')
const { parse } = require('url')
const coalesce = require('defined')
const ras3 = require('random-access-s3')
const aws = require('aws-sdk')
const os = require('os')

async function open({ url }) {
  const { bucket, path } = parseS3URL(url)
  const file = ras3(path, { bucket })
  return file
}

function sanitizeS3URL(url) {
  if (/^s3:\/\//.test(url)) {
    url = url.replace('s3://', '')
  }
  if ('/' == url[0]) {
    url = url.slice(1)
  }
  return url
}

function parseS3URL(url) {
  url = sanitizeS3URL(url)
  url = `s3://${url}`
  let { hostname, pathname } = parse(url)
  if ('/' == pathname[0]) {
    pathname = pathname.slice(1)
  }
  return {
    bucket: hostname,
    path: pathname,
    Bucket: hostname,
    Key: pathname,
  }
}

function makeS3Params(params = {}) {
  const s3params = {}
  if (params) {
    Object.assign(s3params, {
      Bucket: coalesce(params.Bucket, params.bucket),
      Key: coalesce(params.Key, params.key),
    })
  }

  return Object.keys(s3params)
    .filter(k => null != s3params[k])
    .reduce((p, k) => Object.assign(p, { [k]: s3params[k] }), {})
}

function createReadStream({ s3, url }) {
  const s3params = makeS3Params(parseS3URL(url))
  s3 = s3 || new aws.S3()
  return new S3ReadableStream(s3, s3params, {
    concurrency: 2 * os.cpus().length
  })
}

async function stat({ s3, url }) {
  const s3params = makeS3Params(parseS3URL(url))
  s3 = s3 || new aws.S3()
  return await new Promise((resolve, reject) => {
    s3.headObject(s3params, (err, res) => {
      if (err) { reject(err) } else {
        resolve({
          size: res.ContentLength,
          mtime: Date.parse(res.LastModified),
        })
      }
    })
  })
}

module.exports = {
  createReadStream,
  sanitizeS3URL,
  parseS3URL,
  open,
  stat
}
