const ccxt = require('ccxt')
  , path = require('path')
  , _ = require('lodash')
  , tb = require('timebucket')
  , HttpsProxyAgent = require('https-proxy-agent')
  , filterSymbols = require('../../../lib/filter-symbol')

module.exports = function container(conf, so, inOptions) {
  let public_client, authed_client, watch_client, options = {
    adjustForTimeDifference: true
  }
  let exchagneId = 'ccxt'
  exchagneId = so.exchange
  if (inOptions) {
    options = Object.assign(options, inOptions)
  }
  function publicClient() {
    if (!public_client) public_client = new ccxt[exchagneId]({ 'apiKey': '', 'secret': '', options })
    setProxy(public_client)
    return public_client
  }

  function watchClient() {
    if (!watch_client) watch_client = new ccxt.pro[exchagneId]({ 'apiKey': '', 'secret': '', options })
    setProxy(watch_client)
    return watch_client
  }

  function authedClient() {
    if (!authed_client) {
      if (!conf.secret.keys[exchagneId] || !conf.secret.keys[exchagneId].key || conf.secret.keys[exchagneId].key === 'YOUR-API-KEY') {
        throw new Error('bot.noExchangeCredentialsError')
      }
      authed_client = new ccxt[exchagneId]({ 'apiKey': conf.secret.keys[exchagneId].key, 'secret': conf.secret.keys[exchagneId].secret, options, enableRateLimit: true })
      setProxy(authed_client)
    }
    return authed_client
  }
  function setProxy(client) {
    if (so.proxy) {
      const agent = new HttpsProxyAgent(so.proxy)
      client.agent = agent
    }
  }

  /**
  * Convert BNB-BTC to BNB/BTC
  *
  * @param product_id BNB-BTC
  * @returns {string}
  */
  function joinProduct(product_id) {
    let split = product_id.split('-')
    if (split.length > 1) {
      return split[0] + '/' + split[1]
    }
    return product_id
  }

  function retry(method, args, err) {
    if (method !== 'getTrades' && method !== 'getKLines' && method !== 'getTickers') {
      console.error(('\nretry ' + exchagneId + ' API is down! unable to call ' + method + ', retrying in 20s').red)
      if (err) console.error(err)
      console.error(args.slice(0, -1))
    }
    setTimeout(function () {
      exchange[method].apply(exchange, args)
    }, 20000)
  }

  var orders = {}

  var exchange = {
    name: exchagneId,
    historyScan: 'forward',
    historyScanUsesTime: true,
    makerFee: 0.1,
    takerFee: 0.1,
    refreshProducts: function (cb) {
      var client = publicClient()
      function getFullNum(num) {
        if (isNaN(num)) { return num }
        if (_.isInteger(num)) {
          if (num === 0) return 1
          else {
            return '0.' + "0".repeat(num - 1) + "1"
          }
        }
        var str = '' + num
        if (!/e/i.test(str)) { return num }
        return (num).toFixed(18).replace(/0+$/, '')
      }
      client.fetchMarkets().then((markets) => {
        //console.log('market..', markets[0])
        /* markets.forEach(market => {
          if (market.base === 'BTC' || market.base === 'VET') {
            console.log('market..', market)
          }
        }) */
        var products = markets.map((market) => {
          // NOTE: price_filter also contains minPrice and maxPrice
          return {
            id: market.id,
            asset: market.base,
            currency: market.quote,
            active: market.active,
            maker: market.maker,
            taker: market.taker,
            min_size: getFullNum(market.limits.amount.min || market.precision.amount).toString(),
            increment: getFullNum(market.precision.price).toString(),
            asset_increment: getFullNum(market.precision.amount).toString(),
            label: market.base + '/' + market.quote,
            exchagne_id: exchagneId,
            product_id: market.base + '-' + market.quote,
            normalized: exchagneId + '.' + market.base + '-' + market.quote
          }
        })
        filterSymbols(this, products, { currency: conf.product_currency, without_margin: conf.product_without_margin, min_volume: conf.product_min_volume, active: conf.product_active }, (filtered) => {
          var target = require('path').resolve(__dirname, '../../../data/exchanges/' + exchagneId + '_products.json')
          require('fs').writeFileSync(target, JSON.stringify(filtered, null, 2))
          if (cb) cb(filtered)
        })
      })
    },
    getProducts: function () {
      try {
        return require(`../../../data/exchanges/${exchagneId}_products.json`)
      } catch (e) {
        return []
      }
    },
    getTrades: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = publicClient()
      var startTime = undefined
      var args = {}
      if (opts.from) {
        startTime = opts.from
      } else {
        startTime = parseInt(opts.to, 10) - 3600000
        args['endTime'] = opts.to
      }
      const symbol = joinProduct(opts.product_id)
      console.log(symbol, 'start', startTime, opts, args)
      if (opts.last_trade_id) {
        args.fromId = opts.last_trade_id
        args.fetchTradesMethod = 'publicGetHistoricalTrades'
        client.fetchTrades(symbol, undefined, undefined, args).then(result => {
          //  console.log('fetchTrades direct', result.length)
          var trades = result.map(trade => ({
            trade_id: trade.id,
            time: trade.timestamp,
            size: parseFloat(trade.amount),
            price: parseFloat(trade.price),
            side: trade.side
          }))
          cb(null, trades)
        }).catch(function (error) {
          console.error('An error occurred', error)
          return retry('getTrades', func_args)
        })
      }
      else {
        client.fetchTrades(symbol, startTime, undefined, { 'fetchTradesMethod': 'publicGetAggTrades' }).then(result => {
          console.log('fetchAggTrades...', result.length)
          if (!result || !result.length) {
            cb(cb(null, []))
            return
          }
          args.fromId = result[0].id
          args.fetchTradesMethod = 'publicGetHistoricalTrades'
          client.fetchTrades(symbol, undefined, undefined, args).then(result => {
            console.log('fetchTrades history', result.length)
            var trades = result.map(trade => ({
              trade_id: trade.id,
              time: trade.timestamp,
              size: parseFloat(trade.amount),
              price: parseFloat(trade.price),
              side: trade.side
            }))
            cb(null, trades)
          }).catch(function (error) {
            console.error('An error occurred', error)
            return retry('getTrades', func_args)
          })
        })
      }
    },
    getKLines: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = publicClient()
      var startTime = undefined
      var args = {}
      if (opts.from) {
        startTime = opts.from
      }
      const symbol = joinProduct(opts.product_id)
      client.fetchOHLCV(symbol, opts.period, startTime, opts.limit, args).then(result => {
        return result
      }).then(result => {
        var klines = result.map(kline => {
          let d = tb(kline[0]).resize(opts.period)
          let de = tb(kline[0]).resize(opts.period).add(1)
          return {
            period_id: d.toString(),
            time: d.toMilliseconds(),
            size: opts.period,
            close_time: de.toMilliseconds() - 1,
            open: kline[1],
            high: kline[2],
            low: kline[3],
            close: kline[4],
            volume: kline[5]
          }
        })
        cb(null, klines)
      }).catch(function (error) {
        console.error('An error occurred', error)
        if (error.name && error.name.match(new RegExp(/BadSymbol|InvalidOrder|InsufficientFunds|BadRequest/))) {
          return cb(error.name, {
            status: 'rejected',
            reject_reason: error.name
          })
        }
        return retry('getKLines', func_args)
      })

    },
    getBalance: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = authedClient()
      client.fetchBalance().then(result => {
        //console.log('getBalanece..', opts, result)
        var balance = { asset: 0, currency: 0 }
        if (so.future) {
          Object.keys(result).forEach(function (key) {
            if (key === opts.currency) {
              balance.currency = result[key].free + result[key].used
              balance.currency_hold = result[key].used
            }
          })
          result.info.positions.forEach(function (market) {
            // console.log('market', market)
            if (opts.position_side && market.positionSide === opts.position_side) {
              if (market.symbol === (opts.asset + opts.currency) && market.positionSide === opts.position_side) {
                balance.asset = Math.abs(market.positionAmt)
                balance.unrealizedProfit = market.unrealizedProfit
                balance.leverage = market.leverage
                balance.isolated = market.isolated
                balance.positionSide = market.positionSide
                balance.entryPrice = market.entryPrice
                balance.asset_hold = 0

              }
              if (!balance.assets) balance.assets = {}
              if (market.positionAmt != 0) {
                // console.log('market...', market)
                balance.assets[market.symbol.replace(opts.currency, '')] = {
                  asset: Math.abs(market.positionAmt),
                  unrealizedProfit: market.unrealizedProfit,
                  leverage: market.leverage,
                  isolated: market.isolated,
                  positionSide: market.positionSide,
                  entryPrice: market.entryPrice,
                  asset_hold: 0
                }
              }
            }
          })
        } else {
          Object.keys(result).forEach(function (key) {
            if (key === opts.currency) {
              balance.currency = result[key].free + result[key].used
              balance.currency_hold = result[key].used
            } else {
              const num = result[key].free + result[key].used
              if (num > 0) {
                if (!balance.assets) balance.assets = {}
                balance.assets[key] = {
                  asset: num,
                  asset_hold: result[key].used
                }
              }
              if (key === opts.asset) {
                balance.asset = result[key].free + result[key].used
                balance.asset_hold = result[key].used
              }
            }
          })
        }
        // console.log('getBalance result', opts, balance)
        cb(null, balance)
      }).catch(function (error) {
        console.error('An error occurred', error)
        return retry('getBalance', func_args)
      })
    },
    getQuote: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = publicClient()
      // console.log('getQuote ...', client.has)
      if (client.has['fetchBidsAsks']) {
        client.fetchBidsAsks([joinProduct(opts.product_id)]).then(result => {
          // console.log('getQuote result...', result)
          let res = result[Object.keys(result)[0]]
          cb(null, { bid: res.bid, ask: res.ask })
        }).catch(function (error) {
          console.error('An error occurred', error)
          return retry('getQuote', func_args)
        })
      }
      else {
        client.fetchTicker(joinProduct(opts.product_id)).then(result => {
          // console.log('getQuote result...', opts, result)
          cb(null, { bid: result.bid || result.close, ask: result.ask || result.close })
        }).catch(function (error) {
          console.error('An error occurred', error)
          return retry('getQuote', func_args)
        })
      }
    },
    getTickers: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = publicClient()
      var symbols = opts && opts.symbols && opts.symbols.map(s => {
        return joinProduct(s.product_id)
      })
      //  console.log('symbols', symbols)
      client.fetchTickers(symbols).then(result => {
        // console.log('getTickers result...', opts, result)
        Object.keys(result).forEach(r => {
          result[r].normalized = (options.defaultType === 'future' ? exchagneId + 'future.' : exchagneId + ".") + result[r].symbol.replace('/', '-')
          /* if (!result[r].timestamp)  */
          result[r].timestamp = (new Date()).getTime()
        })
        cb(null, result)
      }).catch(function (error) {
        console.error('An error occurred', error)

        if (error.name && error.name.match(new RegExp(/BadSymbol|InvalidOrder|InsufficientFunds|BadRequest/))) {
          return cb(error.name, {
            status: 'rejected',
            reject_reason: error.name
          })
        }
        return retry('getTickers', func_args)
      })
    },
    watchTickers: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = watchClient()
      if (!client.has['watchTicker']) {
        console.log(client.id, 'does not support watchTicker yet')
        return
      }
      var symbols = opts && opts.symbols && opts.symbols.map(s => {
        return joinProduct(s.product_id)
      })
      // console.log('symbols', symbols)
      client.watchTickers(symbols).then(result => {
        // console.log('getTickers result...', opts, result)
        Object.keys(result).forEach(r => {
          result[r].normalized = (options.defaultType === 'future' ? exchagneId + 'future.' : exchagneId + ".") + result[r].symbol.replace('/', '-')
          if (!result[r].timestamp) result[r].timestamp = (new Date()).getTime()
        })
        cb(null, result)
      })
        .catch(function (error) {
          console.error('An error occurred', error)
          if (error.name && error.name.match(new RegExp(/BadSymbol|InvalidOrder|InsufficientFunds|BadRequest/))) {
            return cb(error.name, {
              status: 'rejected',
              reject_reason: error.name
            })
          }
          return retry('getTickers', func_args)
        })
    },
    getDepth: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = publicClient()
      client.fetchOrderBook(joinProduct(opts.product_id), { limit: opts.limit }).then(result => {
        // console.log('getDepth result...', opts, result)
        cb(null, result)
      })
        .catch(function (error) {
          console.error('An error ocurred', error)
          return retry('getDepth', func_args)
        })
    },
    cancelOrder: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = authedClient()
      client.cancelOrder(opts.order_id, joinProduct(opts.product_id)).then(function (body) {
        // console.log('cancelOrder result', opts, body)
        if (body && (body.message === 'Order already done' || body.message === 'order not found')) return cb(body)
        cb(body)
        return
      }, function (err) {
        // match error against string:
        if (err) {
          // decide if this error is allowed for a retry
          if (err.message && err.message.match(new RegExp(/-2011|UNKNOWN_ORDER/))) {
            console.error(('\ncancelOrder retry - unknown Order: ' + JSON.stringify(opts) + ' - ' + err).cyan)
          } else {
            // retry is allowed for this error
            return retry('cancelOrder', func_args, err)
          }
        }
        cb(null, err)
      })
    },
    buy: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = authedClient()
      if (typeof opts.post_only === 'undefined') {
        opts.post_only = true
      }
      opts.type = 'limit'
      var args = {}
      if (opts.order_type === 'taker') {
        delete opts.post_only
        delete opts.price
        opts.type = 'market'
      } else {
        args.timeInForce = 'GTC'
        args.postOnly = opts.post_only
      }
      if (!client.has.createMarketOrder) {
        opts.type = 'limit'
      }
      opts.side = 'buy'
      delete opts.order_type
      if (so.future) {
        args.positionSide = opts.position_side || 'LONG'
        if (args.positionSide === 'SHORT') {
          opts.side = 'sell'
        }
      }
      var order = {}
      //  console.log('\nbuy opts', opts, args)
      client.createOrder(joinProduct(opts.product_id), opts.type, opts.side, this.roundToNearest(opts.size, opts), opts.price, args).then(result => {
        //  console.log('buy result...', opts, result)
        if (result && result.message === 'Insufficient funds') {
          order = {
            status: 'rejected',
            reject_reason: 'balance'
          }
          return cb(null, order)
        }
        order = {
          id: result ? result.id : null,
          status: 'open',
          price: result.average,
          size: this.roundToNearest(opts.size, opts),
          post_only: !!opts.post_only,
          created_at: new Date().getTime(),
          filled_size: '0',
          order_type: opts.type === 'limit' ? 'maker' : 'taker'
        }
        orders['~' + result.id] = order
        cb(null, order)
      }).catch(function (error) {
        console.error('An error occurred', error)

        // decide if this error is allowed for a retry:
        // {"code":-1013,"msg":"Filter failure: MIN_NOTIONAL"}
        // {"code":-2010,"msg":"Account has insufficient balance for requested action"}
        if (error.name && error.name.match(new RegExp(/InvalidOrder|InsufficientFunds|BadRequest/))) {
          return cb(null, {
            status: 'rejected',
            reject_reason: error.name
          })
        }
        if (error.message.match(new RegExp(/-1013|MIN_NOTIONAL|-2010/))) {
          return cb(null, {
            status: 'rejected',
            reject_reason: 'balance'
          })
        }
        return retry('buy', func_args)
      })
    },

    sell: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = authedClient()
      if (typeof opts.post_only === 'undefined') {
        opts.post_only = true
      }
      opts.type = 'limit'
      var args = {}
      if (opts.order_type === 'taker') {
        delete opts.post_only
        delete opts.price
        opts.type = 'market'
      } else {
        args.timeInForce = 'GTC'
        args.postOnly=opts.post_only
      }
      if (!client.has.createMarketOrder) {
        opts.type = 'limit'
      }
      opts.side = 'sell'
      if (so.future) {
        args.positionSide = opts.position_side || 'LONG'
        if (args.positionSide === 'SHORT') {
          opts.side = 'buy'
        }
      }
      delete opts.order_type
      var order = {}
      // console.log('sell opts', opts, args)
      client.createOrder(joinProduct(opts.product_id), opts.type, opts.side, this.roundToNearest(opts.size, opts), opts.price, args).then(result => {
        // console.log('sell result...', opts, result)
        if (result && result.message === 'Insufficient funds') {
          order = {
            status: 'rejected',
            reject_reason: 'balance'
          }
          return cb(null, order)
        }
        order = {
          id: result ? result.id : null,
          status: 'open',
          price: result.average,
          size: this.roundToNearest(opts.size, opts),
          post_only: !!opts.post_only,
          created_at: new Date().getTime(),
          filled_size: '0',
          order_type: opts.type === 'limit' ? 'maker' : 'taker'
        }
        orders['~' + result.id] = order
        cb(null, order)
      }).catch(function (error) {
        console.error('An error occurred', error)

        // decide if this error is allowed for a retry:
        // {"code":-1013,"msg":"Filter failure: MIN_NOTIONAL"}
        // {"code":-2010,"msg":"Account has insufficient balance for requested action"}
        if (error.name && error.name.match(new RegExp(/InvalidOrder|InsufficientFunds|BadRequest/))) {
          return cb(null, {
            status: 'rejected',
            reject_reason: error.name
          })
        }
        if (error.message.match(new RegExp(/-1013|MIN_NOTIONAL|-2010/))) {
          return cb(null, {
            status: 'rejected',
            reject_reason: 'balance'
          })
        }

        return retry('sell', func_args)
      })
    },

    roundToNearest: function (numToRound, opts) {
      var numToRoundTo = _.find(this.getProducts(), { 'asset': opts.product_id.split('-')[0], 'currency': opts.product_id.split('-')[1] }).min_size
      numToRoundTo = 1 / (numToRoundTo)

      return Math.floor(numToRound * numToRoundTo) / numToRoundTo
    },

    getOrder: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = authedClient()
      var order = orders['~' + opts.order_id]
      // console.log('getOrder', opts, opts.order_id, joinProduct(opts.product_id))
      client.fetchOrder(opts.order_id, joinProduct(opts.product_id)).then(function (body) {
        // console.log('getOrder', body)
        if (order) {
          if (body.status !== 'open' && body.status !== 'canceled') {
            order.status = 'done'
            order.done_at = new Date().getTime()
            order.price = body.average?parseFloat(body.average): parseFloat(body.price)
            order.filled_size = parseFloat(body.amount) - parseFloat(body.remaining)
            return cb(null, order)
          }
          cb(null, order)
        } else {
          cb(null, body)
        }
      }, function (err) {
        if (err.name && err.name.match(new RegExp(/InvalidOrder|BadRequest/))) {
          return cb(err)
        }
        return retry('getOrder', func_args, err)
      })
    },
    getOrders: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = authedClient()
      // console.log('getOrder', opts, opts.order_id, joinProduct(opts.product_id))
      client.fetchOrders(joinProduct(opts.product_id), opts.since, opts.limit).then(function (body) {
        // console.log('getOrders', body)
        cb(null, body)
      }, function (err) {
        if (err.name && err.name.match(new RegExp(/InvalidOrder|BadRequest/))) {
          return cb(err)
        }
        return retry('getOrders', func_args, err)
      })
    },
    getCursor: function (trade) {
      // console.log('getCursor result...', trade, (trade.time || trade))
      return (trade.time || trade)
    },
    updateLeverage: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = authedClient()
      client.setLeverage(opts.leverage, joinProduct(opts.product_id)).then(result => {
        // console.log('updateLeverage result...', opts, result)
        cb(null, result)
      })
        .catch(function (error) {
          console.error('An error ocurred', error)
          return retry('updateLeverage', func_args)
        })
    },
    updateMarginMode: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = authedClient()
      client.setMarginMode(opts.marginType, joinProduct(opts.product_id)).then(result => {
        console.log('updateMarginType result...', opts, result)
        cb(null, result)
      })
        .catch(function (error) {
          console.error('An error ocurred', error)
          return retry('updateMarginType', func_args)
        })
    },
    initFees() {
      if (conf.secret.keys[exchagneId] && conf.secret.keys[exchagneId].takerFee) {
        this.takerFee = conf.secret.keys[exchagneId].takerFee
      }
      if (conf.secret.keys[exchagneId] && conf.secret.keys[exchagneId].makerFee) {
        this.makerFee = conf.secret.keys[exchagneId].makerFee
      }
      if (so.takerFee) {
        this.takerFee = so.takerFee
      }
      if (so.makerFee) {
        this.makerFee = so.makerFee
      }
    }
  }
  return exchange
}