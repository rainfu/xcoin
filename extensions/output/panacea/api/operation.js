
var coreFactory = require('../../../../lib/core')
    , { getInitData } = require('./status')
    , moment = require('moment')
    , _ = require('lodash')
    , debug = require('../../../../lib/debug')
    , helpers = require('../../../../lib/helpers')
/**dynamic update watch list group */
const addSymbol = (message, cb, s, conf, engine) => {
    let shouldAddSymbols = message.symbols.filter(m => s.options.symbols.every(p => p.normalized !== m))
    if (!shouldAddSymbols.length) return
    let symbols = shouldAddSymbols.map(p => helpers.objectifySelector(p))
    engine.initSymbols(symbols)
    var core = coreFactory(s, conf, engine)
    core.getInitKLines(() => {
        s.options.symbols.push(...symbols)
        if (s.options.symbols && s.options.symbols.length) {
            let i = 1
            s.options.symbols.forEach(symbol => {
                if (s.symbols[symbol.product_id]) {
                    s.symbols[symbol.product_id].index = i
                    i++
                }
            })
            let data = {
                action: 'init',
                data: getInitData(s)
            }
            if (cb) cb(data)
            data = {
                action: message.action,
                toast: 'trade.' + message.action + 'Ok',
                data: {
                    success: true,
                    buy: message.data.buy
                }
            }
            if (cb) cb(data)

        }
    }, JSON.parse(JSON.stringify(symbols)), {
        limit: s.options.min_periods
    })
}
const removeAllSymbol = (message, cb, s) => {
    while (s.options.symbols.length > 1) {
        let symbol = s.options.symbols.pop()
        delete s.symbols[symbol.product_id]
    }
    let data = {
        action: 'init',
        data: getInitData(s)
    }
    if (cb) cb(data)
    data = {
        action: message.action,
        toast: 'trade.' + message.action + 'Ok'
    }
    if (cb) cb(data)
}
const removeSymbol = (message, cb, s) => {
    let find = s.options.symbols.find(s => s.normalized === message.symbol)
    if (find) {
        let index = s.options.symbols.indexOf(find)
        s.options.symbols.splice(index, 1)
        delete s.symbols[find.product_id]
        let i = 1
        s.options.symbols.forEach(symbol => {
            if (s.symbols[symbol.product_id]) {
                s.symbols[symbol.product_id].index = i
                i++
            }
        })
        let data = {
            action: 'init',
            data: getInitData(s)
        }
        if (cb) cb(data)
        data = {
            action: message.action,
            toast: 'trade.' + message.action + 'Ok'
        }
        if (cb) cb(data)
    }
}
/** bot group */
const getDemoBot = (message, cb) => {
    let data = {
        action: message.action,
        data: [{
            "name": "demoName",
            "des": "demoDes",
            "protocol": "ws",
            "host": "43.153.178.133",
            "port": "17832",
            "id": "bot-demo",
            "type": "xcoin",
            "isDemo": true
        }]
    }
    if (cb) cb(data)
}
const getBalance = (message, cb) => {
    s.exchange.getBalance({
        position_side: "LONG",
        currency: message.data.currency || s.options.symbols[0].currency,
        asset: message.data.asset || s.options.symbols[0].asset
    }, (err, balance) => {
        if (err) {
            return
        }
        if (s.options.future) {
            s.exchange.getBalance({
                position_side: "SHORT",
                currency: message.data.currency || 'BTC',
                asset: message.data.asset || 'USDt'
            }, (err, shortBalance) => {
                if (err) {
                    return
                }
                let data = {
                    balance,
                    shortBalance
                }
                if (cb) cb(data)
                return
            })
        }
        else {
            let data = {
                balance
            }
            if (cb) cb(data)
            return
        }
    })
}
/** update config group */
const updateConfig = (message, cb, s) => {
    Object.assign(s.options, message.data)
    s.options.modified = message.data
    if (message.data.strategy) {
        s.options.strategy = message.data.strategy
    }
    if (!_.isUndefined(message.data.debug)) {
        debug.flip()
        s.options.debug = debug.on
    }
    if (message.data.takerFee || message.data.makerFee) {
        s.exchange.initFees()
    }
    try {
        let newConfig = _.defaultsDeep({ modified: message.data }, s.options)
        //  let filename = s.options.strategy.name + "_" + s.options.period + "_" + (new Date().getTime())
        var target = require('path').resolve(__dirname, '../../../' + s.options.conf)
        require('fs').writeFileSync(target, JSON.stringify(newConfig, null, 2))
        var target2 = require('path').resolve(__dirname, '../../../data/config/last_config.json')
        require('fs').writeFileSync(target2, JSON.stringify(newConfig, null, 2))
        //  console.log('wrote config', target)
        if (message.restart) {
            console.log('\nSome Core Param changed .should restart process...'.orange)
            var target3 = require('path').resolve(__dirname, '../../../data/pm2/restart_' + s.options.exchange + "_" + (s.options.name || '') + '.json')
            require('fs').writeFileSync(target3, JSON.stringify({ event: 'updateConfig', time: moment().format('MMDD HH:mm:ss') }, null, 2))
        }
    } catch (e) {
        console.log('updateConfig error', e)
    }
    let data = {
        action: message.action,
        data: s.options,
        toast: 'trade.' + message.action + 'Ok'
    }
    if (cb) cb(data)
}
const updateSymbolFuture = (message, cb, s) => {
    if (message.data.type === 'marginMode') {
        s.exchange.updateMarginMode({
            marginType: message.data.value,
            product_id: message.symbol
        }, (err) => {
            if (err) return
            let data = {
                action: message.action,
                toast: 'trade.' + message.action + 'Ok'
            }
            if (cb) cb(data)
        })
    } else if (message.data.type === 'leverage') {
        s.exchange.updateLeverage({
            leverage: message.data.value,
            product_id: message.symbol
        }, (err) => {
            if (err) return
            let data = {
                action: message.action,
                toast: 'trade.' + message.action + 'Ok'
            }
            if (cb) cb(data)
        })
    }
}
/** buy sell group */
const buy = (message, cb, s, conf, engine) => {
    let find = s.options.symbols.find(s => s.product_id === message.symbol)
    if (find) {
        var core = coreFactory(s, conf, engine)
        core.buy(() => {
            let data = {
                action: message.action,
                toast: 'trade.' + message.action + 'Ok'
            }
            if (cb) cb(data)
        }, find, message.data.position_side, message.data.size)
    }
}
/** buy sell group */
const sell = (message, cb, s, conf, engine) => {
    let find = s.options.symbols.find(s => s.product_id === message.symbol)
    if (find) {
        var core = coreFactory(s, conf, engine)
        core.sell(() => {
            let data = {
                action: message.action,
                toast: 'trade.' + message.action + 'Ok'
            }
            if (cb) cb(data)
        }, find, message.data.position_side, message.data.size)
    }
}
const sellAll = (message, cb, s, conf, engine) => {
    let boughtSymbols = s.options.symbols.filter((ss) => {
        // console.log('realTickers', s.normalized, realTickers[t].normalized, s.normalized === realTickers[t].normalized)
        if (s.symbols[ss.product_id] && s.symbols[ss.product_id].action && (s.symbols[ss.product_id].action === 'bought' || s.symbols[ss.product_id].action === 'partSell')) {
            return true
        }
        return false
    })
    var core = coreFactory(s, conf, engine)
    core.sellAll(() => {
        let data = {
            action: message.action,
            toast: 'trade.' + message.action + 'Ok'
        }
        if (cb) cb(data)
    }, boughtSymbols)
}

module.exports = {
    addSymbol,
    removeAllSymbol,
    removeSymbol,
    updateConfig,
    updateSymbolFuture,
    buy,
    sell,
    sellAll,
    getDemoBot,
    getBalance
}