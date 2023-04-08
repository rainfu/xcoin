const webSocket = require('ws')
  , random_port = require('random-port')
  , collectionService = require('./mongo-service')
  , debug = require('./debug')
  , _ = require('lodash')
  , ccxt = require('ccxt')
  , tb = require('timebucket')
  , n = require('numbro')
  , crypto = require('crypto')
  , readline = require('readline')
  , moment = require('moment')
  , helpers = require('../lib/helpers')

module.exports = function wsTickers(conf, exchange, so) {
  var collectionServiceInstance = collectionService(conf)
  let startTime = (new Date()).getTime()
  let insertCount = 0
  let totalCount = 0
  let klineScanCount = 0
  let getHotProductsTime = startTime + 86400 * 1000
  var wsServer = {
    wss: null,
    run: function () {
      if (!conf.server.port || conf.server.port === 0) {
        random_port({ from: 17000, range: 1000 }, function (port) {
          this.startServer(conf.server.ip, port)
        })
      } else {
        this.startServer(conf.server.ip, conf.server.port)
      }
    },
    startServer: function (ip, port) {
      var self = this
      this.aliveCount = 0
      this.wss = new webSocket.Server({ host: ip, port: port })
      console.log('WebSocket Ticker Server running on ws://%s:%s', ip, port)
      this.wsExchange = new ccxt.pro[exchange.name]()
      this.wsExchange.throttle.config['maxCapacity'] = 10000
      this.wsExchange.loadMarkets()
      const interval = setInterval(() => {
        this.wss.clients.forEach(function each(ws) {
          if (ws.isAlive === false) {
            this.aliveCount--
            ws.terminate()
            return
          };
          ws.isAlive = false;
          ws.ping();
        });
      }, 30000);
      this.wss.on('close', function close() {
        clearInterval(interval);
      });
      this.wss.on('connection', (ws) => {
        klineScanCount = 0
        this.aliveCount++
        ws.isAlive = true
        console.log('\nWebsocket  client join'.cyan + " " + this.aliveCount.toString().green)
        ws.on('pong', () => {
          ws.isAlive = true
        });
        ws.on('message', (data) => {
          try {
            let message = JSON.parse(data)
            debug.msg('receive message ' + message.action)
            switch (message.action) {
              default:
                self[message.action](message.data, (res) => {
                  self.reply(ws, {
                    action: message.action,
                    data: res
                  })
                })
                break
            }
          } catch (e) {
            self.reply(ws, {
              action: 'error',
              data: e.toString()
            })
            console.log('error', e)
          }
        })

      })
    },
    broadcast(options) {
      console.log('\nbroadcast connect count'.green, this.aliveCount.toString().cyan)
      // console.log('options..', options)
      //watch and broadcast
      this.watchTickers(options)
    },
    async getKLines(options, cb) {
      exchange.getKLines(options, (err, klines) => {
        if (err) {
          cb({
            res: false,
            message: err.toString()
          })
          return
        }
        cb({
          res: true,
          data: klines
        })
      })
    },
    async getTrades(options, cb) {
      exchange.getTrades(options, (err, trades) => {
        if (err) {
          cb({
            res: false,
            message: err.toString()
          })
          return
        }
        cb({
          res: true,
          data: trades
        })
      })
    },
    getProducts(cb) {
      let products = exchange.getProducts()
      if (cb) cb({
        res: true,
        data: products
      })
    },
    async getHotProducts() {
      let options = {
        number: 10,
        limit: 10,
        period: '1d'
      }
      let hlArray = []
      let data = {}
      let totalP = 1000
      let getAliveSymbols = (products) => {
        if (!products.length) {
          console.log('getHotProducts ok')
          data.maxSum = hlArray.sort((a, b) => {
            return b.sum - a.sum
          }).slice(0, options.number).map((h, index) => {
            return {
              index: index + 1,
              product_id: h.symbol,
              price: h.price,
              extra: n(h.sum).format('0.00%'),
              klines: h.dataList
            }
          })
          data.minSum = hlArray.sort((a, b) => {
            return a.sum - b.sum
          }).slice(0, options.number).map((h, index) => {
            return {
              index: index + 1,
              product_id: h.symbol,
              price: h.price,
              extra: n(h.sum).format('0.00%'),
              klines: h.dataList
            }
          })
          data.fastUp = hlArray.sort((a, b) => {
            return b.change - a.change
          }).slice(0, options.number).map((h, index) => {
            return {
              index: index + 1,
              product_id: h.symbol,
              price: h.price,
              extra: n(h.change).format('0.00%'),
              klines: h.dataList
            }
          })
          data.moreUp = hlArray.sort((a, b) => {
            return b.upCount - a.upCount
          }).slice(0, options.number).map((h, index) => {
            return {
              index: index + 1,
              product_id: h.symbol,
              price: h.price,
              extra: h.upCount + "/" + options.limit,
              klines: h.dataList
            }
          })
          data.continueUp = hlArray.sort((a, b) => {
            return b.continueUpCount - a.continueUpCount
          }).slice(0, options.number).map((h, index) => {
            return {
              index: index + 1,
              product_id: h.symbol,
              price: h.price,
              extra: h.continueUpCount,
              klines: h.dataList
            }
          })
          //broadcast to all client 
          this.wss.clients.forEach(function each(ws) {
            ws.send(JSON.stringify({
              action: 'getHotProducts',
              data: data
            }))
          });
          var target = require('path').resolve(__dirname, `../data/exchanges/${exchange.name}_hot_products.json`)
          require('fs').writeFileSync(target, JSON.stringify(data, null, 2))
          return
        }
        let p = products.pop()
        var opts = {
          product_id: p.asset + "-" + p.currency,
          period: options.period,
          limit: options.limit,
          from: tb().resize(options.period).subtract(options.limit).toMilliseconds()
        }
        exchange.getKLines(opts, function (err, klines) {
          if (err) {
            console.log('error', err)
            getAliveSymbols(products)
            return
          }
          let sum = 0, change = 0, dataList = [], perChange = 0, last_change = 0, upCount = 0, continueUpCount = 0, init_price = 0, last_price = 0
          klines.forEach((k) => {
            if (!init_price) init_price = k.open
            var hl = (k.high - k.low) / k.open
            change = (k.close - init_price) / init_price
            perChange = (k.close - k.open) / k.open
            sum += hl
            if (perChange > 0) {
              upCount++
              continueUpCount++
            }
            else {
              continueUpCount = 0
            }
            last_change = perChange
            dataList.push({
              time: k.time,
              close: k.close
            })
            last_price = k.close
            // console.log(opts.product_id, ' getkline ', k.close, last_close, k.open, last_close || k.open, (new Date(k.time)).toLocaleDateString(), k.close, change, sum, upCount, continueUpCount)

          })
          if (last_change <= 0) {
            continueUpCount = 0
          }
          let a = {
            id: p.id,
            symbol: opts.product_id,
            sum,
            change,
            upCount,
            continueUpCount,
            price: last_price,
            dataList
          }
          hlArray.push(a)
          debug.msg('getExchangeHotSymbols finished '.green + ((totalP - products.length) + "/" + totalP).cyan)
          setTimeout(() => {
            getAliveSymbols(products)
          }, 1500)
        })
      }
      let products = exchange.getProducts()
      console.log('\Filted tickers '.green + products.length.toString().cyan)
      totalP = products.length
      getAliveSymbols(products)
    },
    reply: function (ws, data) {
      debug.msg('reply ' + data.action + " " + JSON.stringify(data).length)
      ws.send(JSON.stringify(data))
    },
    getTickers(options, cb) {
      exchange.getTickers(options.symbols, (err, tickers) => {
        if (err) {
          cb({
            res: false,
            message: err.toString()
          })
          return
        }
        cb({
          res: true,
          data: Object.keys(tickers).map(t => {
            return {
              id: tickers[t].timestamp,
              _id: tickers[t].timestamp,
              symbol: tickers[t].symbol,
              time: tickers[t].symbol,
              price: tickers[t].close,
              percentage: tickers[t].percentage,
              volume: tickers[t].baseVolume,
            }
          })
        })
      })
    },
    async watchTickers({ symbols }) {
      symbols = symbols.map(p => {
        return p.product_id.replace('-', '/') + (exchange === 'binanceusdm' ? ':USDT' : '')
      })
      if (so.sim_price) {
        symbols = "mexc.ETH-USDT,mexc.LOOP-USDT,mexc.ALPA-USDT,mexc.BTC-USDT,mexc.DZOO-USDT,mexc.GPT-USDT,mexc.MASK-USDT".split(',').map(p => {
          return {
            product_id: p.replace('mexc.', '')
          }
        })
        // console.log('symbols', symbols)
        let leverage = so.leverage || 1, klineStep = 20
        exchange.getTickers({ symbols }, (err, res) => {
          Object.keys(res).forEach(t => {
            res[t].start_price = res[t].close
            res[t].upRate = (0.5 + Math.random() * 0.5) / 100 / leverage
          })
          const sim_price_loop = () => {
            Object.keys(res).forEach(t => {
              res[t].timestamp = (new Date()).getTime()
              if (klineScanCount < klineStep) {
                res[t].close = res[t].start_price * (1 - klineScanCount * res[t].upRate)
              } else if (klineScanCount < 3 * klineStep) {
                res[t].close = res[t].start_price * (1 + (klineScanCount - 2 * klineStep) * res[t].upRate)
              } else if (klineScanCount < 6 * klineStep) {
                res[t].close = res[t].start_price * (1 + (4 * klineStep - klineScanCount) * res[t].upRate)
              } else if (klineScanCount < 10 * klineStep) {
                res[t].close = res[t].start_price * (1 + (-8 * klineStep + klineScanCount) * res[t].upRate)
              } else if (klineScanCount < 14 * klineStep) {
                res[t].close = res[t].start_price * (1 + (12 * klineStep - klineScanCount) * res[t].upRate)
              } else {
                klineScanCount = 0
                res[t].upRate = (1 + Math.random() * 1) / 100 / leverage
              }
              res[t].close = n(res[t].close).format('0.0000')
            })
            this.doTrades(res)
            // console.log('\nklineScanCount'.green, klineScanCount, res['ETH/USDT'].upRate, moment(res['ETH/USDT'].timestamp).format('HH:mm:ss').green, ' pirce:'.green, res['ETH/USDT'].close)
            klineScanCount++
          }
          setInterval(() => {
            sim_price_loop()
          }, so.poll_scan_time)

        })
      } else if (this.wsExchange.hasWatchTickers) {
        while (true) {
          try {
            //   console.log('symbols', symbols)
            // console.time('watch')
            const res = await this.wsExchange.watchTickers(symbols)
            ////   console.timeEnd('watch')
            //    console.time('res', res.length)
            /* res = {
              'BTC-USDT:USDT': {
                symbol: 'BTC-USDT:USDT',
                close: '3.14',
                timestamp: 16388883232,
                percentage: 1.32,
                baseVolume: 32800
              }
            } */
            await helpers.sleep(conf.server.poll_watch_wait || conf.poll_watch_wait)
            this.doTrades(res)
          } catch (err) {
            console.log('watchTickers error ', err)
            await helpers.sleep(conf.server.poll_watch_wait || conf.poll_watch_wait)
          }
        }
      } else {
        while (true) {
          try {
            exchange.getTickers({ symbols }, (err, res) => {
              // console.log('realTickers', realTickers)
              if (!err && res) {
                this.doTrades(res)
              }
            })
          } catch (err) {
            console.log('getTickers error ', err)
          }
          await helpers.sleep(conf.poll_scan_time)
        }
      }
    },
    async doTrades(res) {
      var tickers = collectionServiceInstance.getTickers()
      var shouldInsertPairs = conf.server.save_pairs.split(',')
      // console.log('shouldInsertPairs', shouldInsertPairs)
      const trades = Object.keys(res).map(t => {
        let id = crypto.randomBytes(4).toString('hex')
        let selector = `${exchange.name}.${res[t].symbol.replace(':USDT', '').replace('/', '-')}`
        return {
          id,
          _id: id,
          trade_id: id,
          selector,
          size: 0,
          side: '',
          close: res[t].close,
          time: res[t].timestamp,
          percentage: res[t].percentage,
          volume: res[t].baseVolume,
          isTrade: true
        }
      })
      // console.log('trade...', trades)
      this.wss.clients.forEach(function each(ws) {
        ws.send(JSON.stringify({
          action: 'tickers',
          data: trades
        }))
      });
      // console.timeEnd('do')
      // console.log('trades', trades.length)
      // console.time('db')
      //  console.log('shouldInsertPairs', shouldInsertPairs)
      let time = (new Date()).getTime()
      let diff = (time - startTime) / 1000
      totalCount += trades.length
      readline.clearLine(process.stdout)
      readline.cursorTo(process.stdout, 0)
      if (shouldInsertPairs && shouldInsertPairs.length) {
        let shouldInsertTrades = trades.filter(t => shouldInsertPairs.some(p => t.selector === p))
        // console.log('shouldInsertTrades', shouldInsertTrades)
        if (shouldInsertTrades && shouldInsertTrades.length) {
          try {
            insertCount += shouldInsertTrades.length
            await tickers.insertMany(shouldInsertTrades)
            let insertRate = (insertCount / diff)
            process.stdout.write(moment().format('MMDD HH:mm:ss').green + ' ' + exchange.name.cyan + ' from ' + moment(startTime).format('MMDD HH:mm:ss').green
              + ' total:'.green + insertCount.toString().cyan + '/' + totalCount.toString().cyan + ' user time:'.green + ('' + diff).cyan + 's insert rate:'.green + (insertRate).toFixed(2).cyan + '/s')
          } catch (err) { console.log('insert error..', err) }
        }
        // console.timeEnd('db')
      }
      else {
        process.stdout.write(moment().format('MMDD HH:mm:ss').green + ' ' + exchange.name.cyan + ' from ' + moment(startTime).format('MMDD HH:mm:ss').green + ' total:'.green + totalCount.toString().cyan + ' user time:'.green + ('' + diff + 's').cyan)
      }
      if (time >= getHotProductsTime) {
        getHotProductsTime = getHotProductsTime + 86400 * 1000
        this.getHotProducts()
      }
    }
  }
  return wsServer
}
