
var coreFactory = require('../../../../lib/core')
    , { getInitData } = require('./status')
    , _ = require('lodash')

    , moment = require('moment')
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
    buy,
    sell,
    sellAll,
    getDemoBot,
    getBalance
}