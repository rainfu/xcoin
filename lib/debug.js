const xcoin = require('../xcoin')
const moment = require('moment')

let debug = xcoin.debug
module.exports = {
  flip: function () {
    module.exports.on = debug = !debug
  },
  msg: function (str) {
    if (debug) {
      console.error('\n' + moment().format('YYYY-MM-DD HH:mm:ss') + ' - ' + str)
    }
  },
  on: debug
}