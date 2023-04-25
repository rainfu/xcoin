var minimist = require('minimist')
    , n = require('numbro')
    // eslint-disable-next-line no-unused-vars
    , path = require('path')
    , _ = require('lodash')
    , debug = require('../lib/debug')
    , helpers = require('../lib/helpers')
    , tb = require('timebucket')
    , colors = require('colors')
    , fs = require('fs')
module.exports = function (program, conf) {
    program
        .command('exchange [exchange]')
        .allowUnknownOption()
        .description('test exchange function')
        .option('--debug', 'output detailed debug info')
        .option('--trade', 'test get trades function')
        .option('--selector <selector>', 'init selector')
        .option('--proxy <proxy>', 'use proxy', String, conf.proxy)
        .option('--tickers <tickers>', 'refresh tickers')
        .option('--ticker <ticker>', 'refresh ticker')
        .option('--quote <quote>', 'refresh quote')
        .option('--refresh', 'refresh products')
        .option('--getorder <orderid>', 'get order', String, null)
        .option('--getorders <symbol>', 'get orders', String, null)
        .option('--kline', 'refresh klines')
        .option('--leverage', 'update leverage')
        .option('--lnum <length>', 'update leverage level', Number, 10)
        .option('--leverageall', 'update all leverage')
        .option('--position_side <position_side>', 'position_side /LONG or SHORT')
        .option('--buy_size <buysize>', 'buy with currency size', Number, 1000)
        .option('--sell_pct <sell_pct>', 'sell_pct', Number, conf.sell_pct)
        .option('--sell', 'test with buy and sell order')
        .option('--buy', 'test with buy')
        .option('--selllist <selllist>', 'sell all symbols', String, '')
        .option('--balance', 'get symbol balance')
        .option('--cancel', 'cancel order')
        .action(function (exchangename, cmd) {
            let so = {}
            conf.proxy = cmd.proxy
            conf.selllist = cmd.selllist
            conf.buy_size = cmd.buy_size
            conf.balance = cmd.balance
            conf.leverage = cmd.leverage
            conf.leverageall = cmd.leverageall
            conf.debug = cmd.debug
            conf.trade = cmd.trade
            conf.sell = cmd.sell
            conf.refresh = cmd.refresh
            conf.onlysell = cmd.onlysell
            conf.getorder = cmd.getorder
            conf.getorders = cmd.getorders
            conf.tickers = cmd.tickers
            conf.lnum = cmd.lnum || 10
            conf.sell_pct = cmd.sell_pct
            conf.mode = conf.paper ? 'paper' : 'live'
            conf.exchange = exchangename
            Object.keys(conf).forEach(function (k) {
                if (k !== 'eventBus' && k !== 'logger' && k !== 'secret' && k !== 'db') {
                    so[k] = conf[k]
                }
            })
            delete so._
            if (so.run_for) {
                so.endTime = moment().add(so.run_for, 'm')
            }

            let symbolsIds = so.watch_symbols.split(',')
            so.symbols = symbolsIds.map(symbol => {
                return helpers.objectifySelector(symbol)
            })
            // console.log('so', so)
            var exchange
            try {
                if (so.mode !== 'live') {
                    exchange = require(path.resolve(__dirname, '../extensions/exchanges/sim/exchange'))(conf, so, s)
                }
                else {
                    exchange = require(path.resolve(__dirname, `../extensions/exchanges/${exchangename}/exchange`))(conf, so)
                }
            } catch (e) {
                exchange = require(path.resolve(__dirname, '../extensions/exchanges/ccxt/exchange'))(conf, so)
            }
            // console.log('exchange', exchange)
            so.position_side = (cmd.position_side || 'long').toUpperCase()

            // console.log('so', so, exchange)
            // console.log('so', so, exchange)
            if (so.getorder) {
                console.log('start get order')
                let parms = so.getorder.split(',')
                var opts = {
                    order_id: parms[0],
                    product_id: parms[1]
                }
                exchange.getOrder(opts, function (err, res) {
                    if (err) console.log('error', err)
                    console.log('getOrder ok..', res)
                    process.exit(0)
                })
                return
            }
            if (so.getorders) {
                console.log('start get orders')
                var opts = {
                    product_id: so.getorders,
                    limit: 5
                }
                exchange.getOrders(opts, function (err, res) {
                    if (err) console.log('error', err)
                    console.log('getOrders ok..', res)
                    process.exit(0)
                })
                return
            }

            if (so.refresh) {
                console.log(exchangename.green + ' start refresh products'.cyan)
                exchange.refreshProducts(() => {
                    console.log(exchangename.green + ' refreshProducts'.cyan, exchange.getProducts().length)
                    process.exit(0)
                })

                return
            }

            if (so.trade) {
                //get trades
                var tradeOpts = {
                    product_id: so.symbols[0].product_id,
                    target_time: new Date().getTime(),
                    start_time: new Date().getTime() - (86400000)
                }
                tradeOpts.from = exchange.getCursor(tradeOpts.start_time)
                exchange.getTrades(tradeOpts, function (err, trades) {
                    if (err) console.log('error', err)
                    console.log('trades..', trades.length)
                    process.exit(0)
                })

                return
            }

            //implement kline
            if (so.kline) {
                //get trades
                let opts = {
                    product_id: so.symbols[0].product_id,
                    period: so.period,
                    start_time: new Date().getTime() - (86400000)
                }
                if (so.min_periods) {
                    opts.start_time = tb().resize(so.period).subtract(so.min_periods).toMilliseconds()
                    opts.limit = so.min_periods
                }
                opts.from = exchange.getCursor(opts.start_time)
                exchange.getKLines(opts, function (err, klines) {
                    if (err) console.log('error', err)
                    console.log('getKLines..', opts, klines.length, 'the first', klines[0], klines[klines.length - 1])
                    process.exit(0)
                })

                return
            }
            if (so.tickers) {
                debug.msg('start refresh all symbol tickers'.green + " " + (' ' + so.symbols.product_id).yellow)
                getTickers(JSON.parse(JSON.stringify(symbols)))
                return
            }
            if (so.ticker) {
                exchange.getTicker(so.symbols[0], function (err, realTickers) {
                    if (err) {
                        console.log('err', err)
                        return
                    }
                    console.log(exchange.name + ' ticker ok'.green, realTickers)
                    process.exit()
                    return
                })
                return
            }
            if (so.quote) {
                exchange.getQuote(so.symbols[0], function (err, realTickers) {
                    if (err) {
                        console.log('err', err)
                        return
                    }
                    console.log(exchange.name + ' quote ok'.green, realTickers)
                    process.exit()
                    return
                })
                return
            }
            //implement so.ticker
            function getTickers(symbols) {
                let opts = {
                    symbols
                }
                exchange.getTickers(opts, function (err, realTickers) {
                    if (err) {
                        console.log('err', err)
                        return
                    }
                    console.log(exchange.name + ' tickers ok'.green, realTickers)
                    process.exit()
                    return
                })
                return
            }

            //implement leverage
            if (so.leverage) {
                console.log(exchangename.green + ' ' + so.symbols[0].product_id + ' start update leverage'.green + ' to ' + so.leverage)
                exchange.updateLeverage({
                    leverage: so.lnum,
                    product_id: so.symbols[0].product_id
                }, function (err, res) {
                    if (err) return
                    console.log('updateLeverage ok'.green + ": " + JSON.stringify(res))
                    process.exit()
                    // checkSymbols(cb, symbols, JSON.parse(JSON.stringify(symbols)))
                })
                return
            }
            if (so.leverageall) {
                exchange.updateLeverageAll(function (err, res) {
                    if (err) return
                    console.log('updateLeverage all ok'.green + ": " + JSON.stringify(res))
                    process.exit()
                    // checkSymbols(cb, symbols, JSON.parse(JSON.stringify(symbols)))
                })
                return
            }
            //implement balane
            if (so.balance) {
                console.log(exchangename.cyan + ' start get balance'.green)
                exchange.getBalance({
                    position_side: so.position_side || "LONG",
                    currency: so.symbols[0].currency,
                    asset: so.symbols[0].asset
                }, function (err, balance) {
                    if (err) return
                    if (!balance.assets) return
                    delete balance.assets['NFT']
                    // console.log('balance', balance)
                    let symbols = Object.keys(balance.assets).map(key => {
                        return Object.assign(balance.assets[key], {
                            product_id: key + '-' + so.symbols[0].currency,
                            normalized: exchangename + "." + key + '-' + so.symbols[0].currency
                        })
                    })
                    //console.log('symbols2', symbols)
                    exchange.getTickers({ symbols }, function (err, realTickers) {
                        // console.log('realTickers', realTickers)
                        // console.log('forward scan', realTickers.length, realTickers[realTickers.length - 1])
                        let sum = 0
                        if (realTickers) {
                            Object.keys(realTickers).forEach(t => {

                                let symbol = symbols.find((s) => (s.normalized === realTickers[t].normalized || s.normalized + ':USDT' === realTickers[t].normalized))
                                //  console.log('t', t, realTickers[t], symbol)
                                if (symbol) {
                                    symbol.capital = n(symbol.asset).multiply(realTickers[t].close).value()
                                    console.log('balance', symbol.normalized, symbol.capital)
                                    sum += symbol.capital
                                }
                            })
                        }
                        console.log('balance USDT ', balance.currency)
                        console.log('balance USDT hold', balance.currency_hold)

                        console.log(exchangename.green + '  get balance total'.green + ": " + (balance.currency + sum))
                        process.exit()
                    })

                    // checkSymbols(cb, symbols, JSON.parse(JSON.stringify(symbols)))
                })
                return
            }
            //implement refrsh  products


            function getFullNum(num) {
                if (isNaN(num)) { return num }
                var str = '' + num
                if (!/e/i.test(str)) { return num }
                return (num).toFixed(18).replace(/0+$/, '')
            }
            function sellAllSymbols(symbols) {
                if (!symbols.length) {
                    console.log('sell all symbols ok..')
                    process.exit(0)
                    return
                }
                let p = symbols.pop()
                var opts = {
                    size: getFullNum(p.size * so.sell_pct / 100),
                    order_type: 'taker',
                    position_side: p.position_side,
                    product_id: p.product_id
                }
                let ti3
                exchange.sell(opts, function (err, sell_order) {
                    if (err) {
                        console.log('error', err)
                        sellAllSymbols(symbols)
                        if (ti3) clearInterval(ti3)
                        return
                    }
                    if (!sell_order || !sell_order.id) {
                        console.log('sell error', sell_order)
                        sellAllSymbols(symbols)
                        if (ti3) clearInterval(ti3)
                        return
                    }
                    // console.log(p.exchange_id + ' sell ', p.product_id, sell_order, sell_order.id)
                    opts.order_id = sell_order.id
                    opts.api_order2 = sell_order
                    ti3 = setInterval(() => {
                        debug.msg('start check sell Order ' + p.product_id)
                        exchange.getOrder(opts, function (err, sell_order2) {
                            if (err) {
                                clearInterval(ti3)
                                console.log('error', err)
                                sellAllSymbols(symbols)
                                return
                            }
                            console.log('sell order status: '.cyan + sell_order2.status.green + ', '.cyan + n(sell_order2.filled_size).divide(sell_order2.size).format('0.0%').green + ' filled'.cyan)
                            if (sell_order2.status === 'done') {
                                clearInterval(ti3)
                                debug.msg('sell order ok ' + p.product_id)
                                sellAllSymbols(symbols)
                            }
                        })
                    }, conf.order_poll_time)
                })

            }
            exchange.refreshProducts(() => {
                console.log(so.selector.exchange_id + ' refreshProducts', exchange.getProducts().length)
                //getBalance && getQuote
                debug.msg('start getBalance'.green)
                var opts = {
                    position_side: selector.position_side || 'LONG',
                    currency: selector.currency,
                    asset: selector.asset
                }
                exchange.getBalance(opts, function (err, balance) {
                    if (err) {
                        console.log('error', err)
                        return
                    }
                    console.log(s.selector.exchange_id + ' getBalance', balance)
                    //start only sell
                    if (so.sell) {
                        debug.msg('start sell '.green)
                        if (so.selllist === 'all') {
                            let shouldSellSymbols = Object.keys(balance.assets).map(function (symbol) {
                                return Object.assign(objectifySelector(exchange.name + "." + symbol + "-USDT"), { position_side: selector.position_side, size: balance.assets[symbol].asset })
                            })
                            //  console.log('shouldSellSymbols', shouldSellSymbols)
                            sellAllSymbols(shouldSellSymbols.reverse())
                        }
                        else if (so.selllist) {
                            let ss = so.selllist.toUpperCase().split(',')
                            let shouldSellSymbols = ss.map(function (symbol) {
                                let sel = objectifySelector(symbol)
                                return Object.assign(sel, { position_side: selector.position_side, size: balance.assets[sel.asset].asset })
                            })
                            // console.log('shouldSellSymbols', shouldSellSymbols)
                            sellAllSymbols(shouldSellSymbols.reverse())
                        }
                        else {
                            console.log('no selllist ')
                        }
                        return
                    }
                    debug.msg('start getQuote'.green)
                    exchange.getQuote({ product_id: selector.product_id }, (err, quotes) => {
                        if (err) {
                            console.log('error', err)
                            return
                        }
                        console.log(s.selector.exchange_id + ' getQuote', quotes)
                        if (so.buy) {
                            let opts = {
                                size: getFullNum(so.buy_size / quotes.ask),
                                price: quotes.ask,
                                product_id: selector.product_id,
                                asset: selector.asset,
                                order_type: so.order_type,
                                position_side: so.position_side,
                                currency: selector.currency
                            }
                            //start buy
                            debug.msg('start buy'.green)
                            // console.log('\nbuy opts', opts)
                            // opts.price = opts.price / 2//TEST
                            exchange.buy(opts, (err, order) => {
                                if (err) {
                                    console.log('error', err)
                                    if (ti2) clearInterval(ti2)
                                    return
                                }
                                console.log(s.selector.exchange_id + ' buy new', order.id)
                                opts.api_order = order
                                opts.order_id = order.id
                            })
                            const ti2 = setInterval(() => {
                                debug.msg('start checkOrder', opts.api_order)
                                if (!_.isEmpty(opts.api_order)) {
                                    //  debug.msg('start checkOrder', opts.api_order.order_id)
                                    exchange.getOrder(opts, function (err, buy_order2) {
                                        if (err) {
                                            console.log('error', err)
                                            clearInterval(ti2)
                                            return
                                        }
                                        console.log('buy order status: '.cyan + buy_order2.status.green + ', '.cyan + n(buy_order2.filled_size).divide(buy_order2.size).format('0.0%').green + ' filled'.cyan)
                                        if (buy_order2.status === 'done') {
                                            debug.msg('buy order ok'.green)
                                            clearInterval(ti2)
                                        }
                                    })
                                }
                                else {
                                    console.log('buy placing order error...')
                                }
                            }, conf.order_poll_time)
                        }
                    })
                })
            })
        })
}

