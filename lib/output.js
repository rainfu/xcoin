var path = require('path')

module.exports = function output(s, conf, engine, keyboard) {
  let apiList = new Map()
  var initialize = function () {
    for (var output in s.options.output) {
      if (s.options.output[output].on) {
        if (s.options.debug) {
          console.log(`initializing output ${output}`.cyan)
        }
        let api = require(path.resolve(__dirname, `../extensions/output/${output}`))(s, conf, engine, keyboard)
        apiList.set(output, api)
        api.run()
      }
    }
  }
  var refresh = function () {
    for (var output in s.options.output) {
      if (s.options.output[output].on) {
        let ws = apiList.get(output)
        ws.refresh()
      }
    }
  }

  return {
    initialize,
    refresh
  }
}
