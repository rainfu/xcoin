var minimist = require('minimist')
  , n = require('numbro')
  , moment = require('moment')
  , readline = require('readline')
  , _ = require('lodash')
  , outputFactory = require('../lib/output')
  , helpers = require('../lib/helpers')
  , engineFactory = require('../lib/engine')
  , coreFactory = require('../lib/core')
  , keyboardFactory = require('../lib/keyboard')
  , webSocket = require('ws')
  , crypto = require('crypto')
  , colors = require('colors')
  , logger = require('../lib/logger')
module.exports = function (program, conf) {
  program
    .command('trade [exchange]')
    .allowUnknownOption()
    .description('run trading bot against live market data')
    .option('--conf <path>', 'path to optional conf overrides file')
    .option('--strategy <name>', 'strategy to use', String, conf.strategy)
    .option('--order_type <type>', 'order type to use (maker/taker)', String, conf.order_type)
    .option('--paper', 'use paper trading mode (no real trades will take place)', Boolean, false)
    .option('--trade_type', 'watch price and account balance, perform trades automatically or not', String, conf.trade_type)
    .option('--period <period>', 'set period ', String, conf.period)
    .option('--poll_scan_time <ms>', 'poll new trades at this interval in ms', Number, conf.poll_scan_time)
    .option('--run_for <minutes>', 'Execute for a period of minutes then exit with status 0', String, 0)
    .option('--debug', 'output detailed debug info', Boolean, conf.debug)
    .option('--with_server', 'get tickers from server', Boolean, false)
    .option('--sim_price', 'get tickers from sim server', Boolean, false)
    .option('--watch_symbols <watch_symbols>', 'init symbols in trade', String, conf.watch_symbols)
    .option('--proxy <proxy>', 'use proxy', String, conf.proxy)
    .action(function (exchange) {
      //re-init all symbols and run 
      var serverInt
      var s = {
        options: JSON.parse(JSON.stringify(minimist(process.argv))),
        symbols: {},
        status: {
          hasConfig: true,
          hasStrategy: true,
          hasMarket: true,
          hasBacktest: false,
          tradeListLen: 0,
          startCapital: 0,
          currentCapital: 0,
          tradeNum: 0,
          dynamicUsdtProfit: 0,
          dynamicProfit: 0,
          usdtProfit: 0,
          profit: 0
        }
      }
      var so = s.options
      // init bot options don't send this params to client
      Object.keys(conf).forEach(function (k) {
        if (k !== 'eventBus' && k !== 'secret' && k !== 'db') {
          so[k] = conf[k]
        }
      })
      delete so._
      if (so.run_for) {
        so.endTime = moment().add(so.run_for, 'm')
      }
      so.mode = so.paper ? 'paper' : 'live'
      if (so.mode !== 'live') {
        s.balance = {
          start_capital: so.currency_capital,
          currency: so.currency_capital,
          currency_hold: 0
        }
      }
      else {
        s.balance = {
          start_capital: 0,
          currency: 0,
          currency_hold: 0
        }
      }
      so.exchange = exchange
      let symbolsIds = so.watch_symbols.split(',')
      so.symbols = symbolsIds.map(symbol => {
        return helpers.objectifySelector(symbol)
      })
      // console.log('so,', so.symbols)
      // return
      var target = require('path').resolve(__dirname, '../data/config/last_config.json')
      require('fs').writeFileSync(target, JSON.stringify(so, null, 2))
      //init engine and other modules
      var engine = engineFactory(s, conf)
      var core = coreFactory(s, conf, engine)
      var keyboard = keyboardFactory(s, conf, core)
      var output = outputFactory(s, conf, engine, keyboard)
      //init bot head message 
      writeHead()
      //init web socket and other api
      output.initialize()
      //init bot keyboard event
      initKeyboard()
      // start the main bot loop
      run(0)
      /**
       * start the main bot loop
       */
      function run(code = 0) {
        //var days = Math.ceil((new Date().getTime() - query_start) / 86400000)
        s.exchange.refreshProducts((products) => {
          console.log('\n' + so.exchange.cyan + ' refreshProducts to '.green, products.length.toString().yellow)
          let notExitProducts = so.symbols.filter(symbol => {
            return products.every(p => p.product_id !== symbol.product_id)
          })
          notExitProducts.forEach(find => {
            let index = so.symbols.indexOf(find)
            so.symbols.splice(index, 1)
            delete s.symbols[find.product_id]
            let i = 1
            so.symbols.forEach(symbol => {
              if (s.symbols[symbol.product_id]) {
                s.symbols[symbol.product_id].index = i
                i++
              }
            })
            console.log('Remove not exit symbol'.green, find.product_id.cyan)
          })
          console.log('\nStart get purchased asset'.cyan)
          engine.initExchange((err, longSymbols, balance) => {
            s.balance.start_capital = balance.currency
            s.balance.currency = balance.currency
            s.balance.currency_hold = balance.currency_hold
            engine.initExchange((err, shortSymbols, shortBalance) => {
              let symbols = [...longSymbols, ...shortSymbols]
              symbols.forEach(symbol => {
                s.balance.start_capital = n(s.balance.start_capital).add(parseFloat(symbol.unrealizedProfit)).value()
              })

              //add buyed symbols to watch symbols

              let buyedSymbols = initBuyedSymbols(symbols)
              //remove blacklist symbols
              initBlackListSymbols(buyedSymbols)
              //init all watch symbols
              engine.initSymbols(so.symbols)
              console.log('Init exchanges symbols ok'.cyan, so.symbols.map(s => s.symbol ? s.label : s.product_id).join(','))
              //get all klines for symbols
              var opts = {
                limit: so.min_periods
              }
              core.getInitKLines(() => {
                console.log('get all init klines ok'.cyan/* , s */)
                s.status.status = 'ready'
                if (so.watch_include_bought) {
                  buyedSymbols && buyedSymbols.forEach(b => {
                    s.symbols[b.product_id].action = 'bought'
                    s.symbols[b.product_id]['last_buy_price'] = b.entry_price
                    s.symbols[b.product_id]['last_buy_type'] = 'prev_buy_' + (b.positionSide === 'LONG' ? 'long' : 'short')
                    s.symbols[b.product_id].my_trades.push({
                      order_id: crypto.randomBytes(4).toString('hex'),
                      time: (new Date()).getTime(),
                      execution_time: 0,
                      slippage: 0,
                      type: 'buy',
                      size: b.asset_size,
                      fee: 0,
                      price: b.entry_price,
                      order_type: 'maker',
                      action: s.symbols[b.product_id]['last_buy_type'],
                      profit: 0,
                      usdtProfit: 0,
                      position_side: b.positionSide
                    })
                    s.symbols[b.product_id].sell_stop = n(b.entry_price).subtract(n(b.entry_price).multiply(so.sell_stop_pct / 100)).value()
                    if (b.positionSide === 'SHORT') {
                      s.symbols[b.product_id].sell_stop = n(b.entry_price).add(n(b.entry_price).multiply(so.sell_stop_pct / 100)).value()
                    }
                    // console.log('buyedSymbols', buyedSymbols)
                    engine.syncBalance(() => {
                      // console.log('xx'.cyan, b, s.symbols[b.product_id])
                    }, b)
                    //    console.log('s.symbols[b.product_id]', b.product_id, s.symbols[b.product_id]['last_buy_type'])
                  })

                }
                core.saveBotLoop()
                engine.writeHeader()
                timeScanLoop()
                broadcastLoop()
              }, _.cloneDeep(so.symbols), opts)
            }, 'SHORT')
          })
        })
      }
      /**
       * get tickers from websocket server
       */
      function broadcastLoop() {
        output.refresh()
        setInterval(() => {
          output.refresh()
        }, so.poll_broadcast_time)
      }

      function timeScanLoop() {
        if (so.with_server) {
          websocketScan()
        }
        else {
          timeScan()
          setInterval(timeScan, so.poll_scan_time)
        }
      }
      /**
       * get tickers from websocket server
       */
      function websocketScan() {
        console.log('Websocket client to scan '.green + ('ws://' + so.server.ip + ':' + so.server.port).cyan)
        let client = new webSocket('ws://' + so.server.ip + ':' + so.server.port);

        client.on('error', function (err) {
          console.log('error........', err)
        });
        client.on('open', function open() {
          clearInterval(serverInt)
          //client.send(JSON.stringify({ message: { action: 'test' } }));
        });
        client.on('close', function close() {
          if (serverInt) {
            clearInterval(serverInt)
          }
          serverInt = setInterval(() => {
            console.log('check server status...'.green)
            timeScanLoop()
          }, 3000)
          //client.send(JSON.stringify({ message: { action: 'test' } }));
        });
        client.on('message', function message(data) {
          let message = JSON.parse(data)
          //  console.log('message..', message)
          if (message.action === 'tickers') {
            // console.log('start scan', message.data)
            let inTrades = message.data.filter(t => {
              return so.symbols.some(sy => sy.normalized === t.selector)
            })
            // console.log('inTrades', inTrades)
            checkTrade(inTrades)
          }
          //console.log('received: %s', data);
        });
        //  console.log('timeScan symbols', so.symbols.length)
      }
      /**
       * get tickers from own exchagne request
       */
      function timeScan() {
        checkRunForEnd()
        if (so.symbols.length) {
          klineScan()
        }
        else {
          console.log('no symbol scan')
          setTimeout(() => {
            console.log('xxx')
          }, 3000)
        }
      }
      function klineScan() {
        let opts = {
          symbols: so.symbols
        }
        s.exchange.getTickers(opts, function (err, realTickers) {
          // console.log('realTickers', realTickers)
          if (err || !realTickers) return
          // console.log('forward scan', realTickers)
          let inTrades = Object.keys(realTickers).filter(t => {
            return so.symbols.some(sy => sy.normalized === realTickers[t].normalized)
          }).map(t => {
            /*  klineScanCount++
             console.log('\nklineScanCount', klineScanCount)
             if (klineScanCount > 50) {
               realTickers[t].close = realTickers[t].close * (100 + (120 - klineScanCount) / 10) / 100
             } else if (klineScanCount > 20) {
               if (klineScanCount > 36) {
                 realTickers[t].close = realTickers[t].close * (100 + (4 + klineScanCount - 40) / 10) / 100
               }
               else {
                 realTickers[t].close = realTickers[t].close * (100 + (40 - klineScanCount) / 10) / 100
               }
             }
             else {
               realTickers[t].close = realTickers[t].close * (100 + klineScanCount / 10) / 100
             }
             */


            //for short
            /* if (klineScanCount > 60) {
              realTickers[t].close = realTickers[t].close * (100 + (klineScanCount - 120) / 10) / 100
            } else if (klineScanCount > 24) {
              if (klineScanCount > 50) {
                realTickers[t].close = realTickers[t].close * (100 - (klineScanCount - 50) / 10) / 100
              }
              else {
                realTickers[t].close = realTickers[t].close * (100 + (klineScanCount - 48) / 10) / 100
              }
            }
            else {
              realTickers[t].close = realTickers[t].close * (100 - klineScanCount / 10) / 100
            } */
            let id = crypto.randomBytes(4).toString('hex')
            return {
              id,
              _id: id,
              trade_id: String(realTickers[t].timestamp),
              selector: realTickers[t].normalized,
              size: 0,
              side: '',
              close: realTickers[t].close,
              time: realTickers[t].timestamp,
              percentage: realTickers[t].percentage,
              volume: realTickers[t].baseVolume,
              isTrade: true
            }
          })
          checkTrade(inTrades)

        })
      }
      /**
       * check trade 
       * @param {*} inTrades 
       */
      function checkTrade(inTrades) {
        // console.log('checkTrade', inTrades)
        inTrades.forEach(trade => {
          let symbol = so.symbols.find(sy => sy.normalized === trade.selector)
          // console.log('realTickers', symbol, kline)
          engine.updateKLine(symbol, trade, false, function (err) {
            if (err) {
              console.error('\n' + moment().format('YYYY-MM-DD HH:mm:ss') + ' - error updateKLine', err)
              // console.error(err)
              return
            }
          })
        })
        //write total report on screen
        engine.refreshBotData()
      }
      /**
       * write head message on screeen
       */
      function writeHead() {
        var head = '\n\n------------------------------------------ INITIALIZE  OUTPUT ------------------------------------------'
        console.log(head)
        logger.info('------------------------------------------ BOT  START ------------------------------------------')
        var minuses = Math.floor((head.length - so.mode.length - 19) / 2)
        console.log('-'.repeat(minuses) + ' STARTING ' + so.mode.toUpperCase() + ' TRADING ' + '-'.repeat(minuses + (minuses % 2 == 0 ? 0 : 1)))
        if (so.mode === 'paper') {
          console.log('!!! Paper mode enabled. No real trades are performed until you remove --paper from the startup command.')
        }
        if (so.proxy) {
          console.log('!!! Use Proxy:', so.proxy)
        }
        console.log('Press ' + ' l '.inverse + ' to list available commands.\n')
      }
      /**
       *  init keyboard event
       */
      function initKeyboard() {
        if (!so.non_interactive) {
          readline.emitKeypressEvents(process.stdin)
          if (process.stdin.setRawMode) {
            process.stdin.setRawMode(true)
            process.stdin.on('keypress', keyboard.executeKey)
          }
        }
      }
      /**
       * check run for end time
       */
      function checkRunForEnd() {
        if (so.endTime && so.endTime - moment() < 0) {
          console.log('Run for pre defined '.red, so.run_for.red, 'minites and exit!'.red)
          // Not sure if I should just handle exit code directly or thru printTrade.  Decided on printTrade being if code is added there for clean exits this can just take advantage of it.
          engine.exit(() => {
            core.saveBot()
            process.exit(0)
          })
        }
      }
      /**
       * init buyed symbols
       * @param {*} symbols 
       * @returns 
       */
      function initBuyedSymbols(symbols) {
        if (!symbols || !symbols.length) return
        let buyedSymbols = []
        //add buyed symbol
        if (so.watch_include_bought) {
          buyedSymbols = symbols.map(symbol => {
            // console.log('symbol', symbol)
            return Object.assign(helpers.objectifySelector(symbol.normalized), { positionSide: symbol.positionSide, entry_price: symbol.entryPrice, asset_size: symbol.asset, capital_size: symbol.unrealizedProfit })
          }).map(symbol => {

            let product = s.exchange.getProducts().find(x => symbol.product_id === (x.asset + '-' + x.currency))
            return Object.assign(symbol, product)
          }).filter(symbol => {
            // console.log('symbol', symbol, s.capital_size > 0 && symbol.capital_size > so.min_buy_size)
            if (s.options.future) {
              return symbol.asset_size > symbol.min_size
            }
            else {
              return symbol.capital_size > 0 && symbol.capital_size > so.min_buy_size
            }
          })
          //  console.log('buyedSymbols', buyedSymbols)
          buyedSymbols.forEach(symbol => {
            console.log('Find bought symbol '.cyan, (symbol.normalized).green, 'positionSide', symbol.positionSide, 'asset_size '.cyan, symbol.asset_size, 'capital_size ', symbol.capital_size)
          })

          let shouldAddSymbols = buyedSymbols.filter(bs => {
            return so.symbols.every(b2 => b2.normalized !== bs.normalized)
          })
          so.symbols.push(...shouldAddSymbols)
        }
        //  console.log('so.symbols'.cyan, so.symbols)
        return buyedSymbols
      }
      /**
       * remove symbol in backlist
       * @param {*} buyedSymbols 
       */
      function initBlackListSymbols(buyedSymbols) {
        if (so.watch_with_black_list) {
          if (so.black_list) {
            console.log('Remove symbol from black list'.cyan, so.black_list)
            let black_list = so.black_list.split(',').map(symbol => {
              return helpers.objectifySelector(symbol)
            })
            so.symbols = so.symbols.filter(b => {
              return black_list.every(b2 => {
                return b.normalized !== b2.normalized
              })
            })
            if (buyedSymbols) {
              buyedSymbols = buyedSymbols.filter(b => {
                return !black_list.find(b2 => b2.normalized === b.normalized)
              })
            }
          }
        }
      }
    })
}
