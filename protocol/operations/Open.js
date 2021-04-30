const debug = require('debug')('cfsnet:protocol:operations:Open')

const messages = require('../messages')

const {
  AccessDeniedError,
  BadRequestError,
  NotOpenedError,
} = require('../error')

const kZeroBuffer = Buffer.from('\0')

/**
 * `Open(string path) - uint32`
 * @param {Object} opts
 */
module.exports = { Open }
async function Open({
  request, operation, message, cfs
}) {
  const op = messages.Open.decode(message)
  const flags = op ? op.flags.split('') : []

  let createIfNotExists = false
  let fileDescriptor = 0
  let truncateFile = false
  let readonly = true

  debug('op:', op)

  const badFlagsError = new BadRequestError(`Bad flags: '${op.flags}'`)

  if (!op.path || 'string' !== typeof op.path || 0 === op.path.length) {
    throw new BadRequestError('Bad file path.')
  }

  if ('r' === flags[0]) {
    if (flags.length > 2) {
      throw badFlagsError
    } else if (2 === flags.length) {
      if ('+' === flags[1]) {
        readonly = false
      } else {
        throw badFlagsError
      }
    }
  } else if ('w' === flags[0]) {
    readonly = false
    truncateFile = true
    createIfNotExists = true

    if (flags.length > 3) {
      throw badFlagsError
    } else if (2 === flags.length) {
      if ('+' === flags[1]) {
        void 0
      } else if ('x' === flags[1]) {
        createIfNotExists = false
      } else {
        throw badFlagsError
      }
    } else if (3 === flags.length) {
      if ('x' === flags[1] && '+' === flags[2]) {
        void 0
      } else {
        throw badFlagsError
      }
    }
  } else if ('a' === flags[0]) {
    readonly = false

    if (flags.length > 2) {
      throw badFlagsError
    } else if (2 === flags.length) {
      if ('+' === flags[1]) {
        void 0
      } else if ('x' === flags[1]) {
        createIfNotExists = false
      } else {
        throw badFlagsError
      }
    } else if (3 === flags.length) {
      if ('x' === flags[1] && '+' === flags[2]) {
        void 0
      } else {
        throw badFlagsError
      }
    }
  } else if (flags[0] && flags[0].length) {
    throw new BadRequestError(`Unsupported flag: '${op.flags}'`)
  } else {
    throw new BadRequestError('Expecting open flags.')
  }

  if (!cfs.readable) {
    throw new AccessDeniedError('Not readable.')
  }

  if (false === readonly) {
    if (!cfs.writable) {
      throw new AccessDeniedError('Not writable.')
    }

    if (!createIfNotExists) {
      try {
        await cfs.access(op.path)
      } catch (err) {
        throw new AccessDeniedError(`File exists: '${op.path}'`)
      }
    } else {
      try {
        await cfs.access(op.path)
      } catch (err) {
        await cfs.touch(op.path)
      }
    }

    if (truncateFile) {
      await cfs.writeFile(op.path, kZeroBuffer)
    }
  }

  try {
    fileDescriptor = await cfs.open(op.path)
  } catch (err) {
    throw new BadRequestError(err.message)
  }

  if (fileDescriptor > 0) {
    return messages.Number.encode({ value: fileDescriptor })
  }

  throw new NotOpenedError("Can't open file descriptor.")
}
