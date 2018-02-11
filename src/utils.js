var config = require('config')

function log () {
  if (config.has('debug') && config.get('debug')) {
    console.log.apply(this, Array.prototype.slice.call(arguments))
  }
}

function error () {
  if (config.has('debug') && config.get('debug')) {
    console.error.apply(this, Array.prototype.slice.call(arguments))
  }
}

module.exports = {
  log,
  error
}
