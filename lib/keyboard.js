const z = require('zero-fill')
  , n = require('numbro')
  , { formatCurrency } = require('./helpers')
  , debug = require('./debug')
module.exports = function keyboard(s, conf, core) {
  var keyIndex = 0
  function printLog(str, cr = false) {
    if (str) {
      console.log((cr ? '\n' : '') + str)
    }
  }
  function listKeys() {
    printLog('Available command keys:', true)
    const keyMap = new Map()
    keyMap.set('l', 'list keyboard options')
    keyMap.set('b', 'limit'.cyan + ' BUY'.green)
    keyMap.set('g', 'limit short'.cyan + ' BUY'.green)
    keyMap.set('s', 'limit'.cyan + ' SELL'.red)
    keyMap.set('S', 'sell all symbols'.cyan)
    keyMap.set('z', 'limit short'.cyan + ' SELL'.green)
    keyMap.set('d', 'toggle DEBUG'.cyan)
    keyMap.set('D', 'delete current select symbol'.green)
    keyMap.set('c', 'cancel order'.cyan)
    keyMap.set('m', 'toggle MANUAL trade in LIVE mode ON / OFF'.cyan)
    keyMap.set('T', 'switch to \'Taker\' order type'.cyan)
    keyMap.set('M', 'switch to \'Maker\' order type'.cyan)
    keyMap.set('L', 'switch to \'LIVE\'mode'.cyan)
    keyMap.set('P', 'switch to \'PAPER\' mode'.cyan)
    keyMap.set('o', 'show current options'.cyan)
    keyMap.set('O', 'show current symbol options in a dirty view (full list)'.cyan)
    keyMap.set('c+ctrl', 'save bot and exit!'.cyan)
    for (let ii = 1; ii < 10; ii++) {
      keyMap.set("" + ii, `select picker[${ii}] or symbol[${ii}] to`.cyan)
    }
    for (let ii = 1; ii < 10; ii++) {
      keyMap.set("Alt+" + ii, `select picker[${ii + 10}] or symbol[${ii + 10}] to`.cyan)
    }
    /* for (let ii = 1; ii < 10; ii++) {
      keyMap.set("F" + ii, `select picker[${ii + 20}] or symbol[${ii + 20}] to`.cyan)
    } */
    keyMap.set("Alt+s", `sell all bought symbols`.cyan)
    keyMap.forEach((value, key) => {
      printLog(' ' + key + ' - ' + value)
    })
  }
  function executeCommand(command, symbol, cb) {
    var info = { ctrl: false }
    if (s.options.debug) {
      console.log('\nCommand received: ' + command)
    }
    executeKey(command, info, symbol, cb)
  }

  function listTicketOptions() {
    printLog([
      z(20, 'Index'.cyan, ' '),
      z(25, 'Symbol'.cyan, ' '),
      z(20, 'Period'.cyan, ' '),
      z(25, 'Price'.cyan, ' '),
      z(20, 'Action'.cyan, ' '),
      z(25, 'usdtProfit'.cyan, ' '),
      z(25, 'profit'.cyan, ' '),
      z(25, 'dynamicProfit'.cyan, ' ')
    ].join(''))
    s.options.symbols.forEach(symbol => {
      let price = s.symbols[symbol.product_id].period && s.symbols[symbol.product_id].period.close ? formatCurrency(s.symbols[symbol.product_id].period.close, symbol.currency, true, true, true) : ''
      printLog([
        z(9, s.symbols[symbol.product_id].index, ' '),
        z(16, symbol.symbol ? symbol.symbol : symbol.product_id, ' '),
        z(9, s.symbols[symbol.product_id]._period, ' '),
        z(18, '       ' + price, '   '),
        z(12, '    ' + (s.symbols[symbol.product_id].action ? s.symbols[symbol.product_id].action : '         ').cyan, ' '),
        z(20, '         ' + n(s.symbols[symbol.product_id].usdtProfit).format('0.00')[s.symbols[symbol.product_id].usdtProfit > 0 ? 'green' : 'red'] + '    ', ' '),
        z(20, '         ' + (n(100 * s.symbols[symbol.product_id].profit).format('0.00') + '%')[s.symbols[symbol.product_id].usdtProfit > 0 ? 'green' : 'red'], ' '),
        z(20, '      ' + (n(100 * s.symbols[symbol.product_id].dynamicProfit).format('0.00') + '%')[s.symbols[symbol.product_id].dynamicProfit > 0 ? 'green' : 'red'], ' ')
      ].join(''))
    })
  }

  function executeKey(key, info, symbol, cb) {
    if (!s.options.symbols.length) return
    if (!symbol) symbol = s.options.symbols[keyIndex - 1] || s.options.symbols[0]
    printLog('Execute key ' + (key ? key.green : '') + ' symbol ' + (symbol ? symbol.product_id.green : ''))
    if (key === 'l') {
      listKeys()
      if (cb) cb()
    } else if (key === 'b' && !info.ctrl) {
      core.buy(cb, symbol, 'LONG', null, false)
      // console.log('key.', symbol, s.symbols[symbol.product_id])
      //  engine.executeSignal('buy', null, null, false, false, false, symbol)
      printLog('manual'.cyan + ' BUY'.green + ' command executed'.cyan, true)
    } else if (key === 'g' && !info.ctrl) {
      if (!s.options.future) return
      core.buy(cb, symbol, 'SHORT', null, false)
      printLog('manual'.cyan + ' BUY SHORT'.green + ' command executed'.cyan, true)
    } else if (key === 's' && !info.ctrl) {
      core.sell(cb, symbol, 'LONG', null, false)
      printLog('manual'.cyan + ' SELL'.red + ' command executed'.cyan, true)
    } else if (key === 'z' && !info.ctrl) {
      if (!s.options.future) return
      core.sell(cb, symbol, 'SHORT', null, false)
      printLog('manual'.cyan + ' SELL SHORT'.red + ' command executed'.cyan, true)

    } else if (key === 'D' && !info.ctrl) {
      let index = s.options.symbols.indexOf(symbol)
      s.options.symbols.splice(index, 1)
      delete s.symbols[symbol.product_id]
      let i = 1
      s.options.symbols.forEach(symbol => {
        if (s.symbols[symbol.product_id]) {
          s.symbols[symbol.product_id].index = i
          i++
        }
      })
      printLog('manual'.cyan + ' remvoe ' + symbol.product_id + ' command executed'.cyan, true)
    } else if ((key === 'c') && !info.ctrl) {
      delete s.symbols[symbol.product_id].buy_order
      delete s.symbols[symbol.product_id].sell_order
      printLog('manual'.cyan + ' order cancel' + ' command executed'.cyan, true)
      if (cb) cb()
    } else if (key === 'T' && !info.ctrl) {
      s.options.order_type = 'taker'
      printLog('Taker fees activated'.bgRed, true)
      if (cb) cb()
    } else if (key === 'M' && !info.ctrl) {
      s.options.order_type = 'maker'
      printLog('Maker fees activated'.black.bgGreen, true)
      if (cb) cb()
    } else if (key === 'L' && !info.ctrl) {
      s.options.paper = false
      s.options.mode = 'live'
      printLog('live mode activated'.bgRed, true)
      if (cb) cb()
    } else if (key === 'P' && !info.ctrl) {
      s.options.paper = true
      s.options.mode = 'paper'
      printLog('paper mode activated'.black.bgGreen, true)
      if (cb) cb()
    } else if (key === 'o' && !info.ctrl) {
      printLog('current Options' + JSON.stringify(s.options, null, 2))
    } else if (key === 'O' && !info.ctrl) {
      listTicketOptions()
    } else if (key === 'd' && !info.ctrl) {
      debug.flip()
      s.options.debug = debug.on
      printLog('DEBUG mode: ' + (debug.on ? 'ON'.green.inverse : 'OFF'.red.inverse), true)
    } else if (info.name === 'c' && info.ctrl) {
      // @todo: cancel open orders before exit
      core.saveBot(true, () => {
        process.exit(0)
      })
    } else if (parseInt(key) > 0 && !info.ctrl) {
      if (parseInt(key) > s.options.symbols.length) return
      keyIndex = parseInt(key)
      printLog('Select symbol index '.cyan + (' ' + keyIndex).green + ' symbol ' + (s.options.symbols[keyIndex - 1].product_id).green, true)
    } else if (key === 'S' && !info.ctrl) {
      let boughtSymbols = s.options.symbols.filter((ss) => {
        // console.log('realTickers', s.normalized, realTickers[t].normalized, s.normalized === realTickers[t].normalized)
        if (s.symbols[ss.product_id] && s.symbols[ss.product_id].action && s.symbols[ss.product_id].action === 'bought') {
          return true
        }
        return false
      })
      core.sellAll(function () {
        console.log('sellAll ok')
        if (cb) cb()
      }, boughtSymbols)
      printLog('manual'.cyan + ' SELL ALL'.red + ' command executed'.cyan, true)
    }
  }

  return {
    listKeys,
    printLog,
    executeCommand,
    executeKey
  }
}
