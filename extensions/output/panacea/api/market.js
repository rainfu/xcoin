var coreFactory = require('../../../../lib/core')
/**
 * get exchagne all products
 * @param {*} message 
 * @param {*} cb 
 * @param {*} s 
 */
const getProducts = (message, cb, s, conf, engine) => {
    let core = coreFactory(s, conf, engine)
    let pData = core.getExchangeProducts(s.options.exchange, 'USDT', 'detail')
    let data = {
        action: message.action,
        data: pData[0].products
    }
    if (cb) cb(data)
}
/**
 * get exchange symbols real-time price
 * @param {*} message 
 * @param {*} cb 
 * @param {*} s 
 */
const getTickers = (message, cb, s) => {
    s.exchange.getTickers(message.data, (err, realTickers) => {
        if (realTickers) {
            let tickers = Object.keys(realTickers).map(t => {
                return {
                    symbol: realTickers[t].symbol,
                    price: realTickers[t].close,
                    percentage: realTickers[t].percentage,
                }
            })
            let data = {
                action: message.action,
                data: tickers
            }
            if (cb) cb(data)
        }
    })
}
/**
 * get exchange hot products
 * @param {} message 
 * @param {*} cb 
 */
const getPickerNormal = (message, cb, s) => {
    let data = {
        action: message.action,
        data: require(`../../../../data/exchanges/${s.options.exchange}_hot_products.json`)
    }
    if (cb) cb(data)
}
/**
 * get exchange symbol klines
 * @param {*} message 
 * @param {*} cb 
 * @param {*} s 
 */
const getKlines = (message, cb, s) => {
    s.exchange.getKLines(message.data, (err, klines) => {
        if (err) {
            return
        }
        let data = {
            action: message.action,
            data: {
                period: message.data.period,
                klines
            }
        }
        if (cb) cb(data)
    })
}
module.exports = {
    getKlines,
    getProducts,
    getPickerNormal,
    getTickers
}