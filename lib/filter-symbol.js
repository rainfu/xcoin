var debug = require('./debug')
module.exports = function (exchange, products, options, cb) {
    function filterCurrency(products, currency = 'USDT') {
        let len = products.length
        let filtered = products.filter(f => f.currency === currency)
        debug.msg('filter '.cyan + (len) + " " + filtered.length.toString().green + ' symbols with type'.cyan + " " + currency.green)
        return filtered
    }
    function filterActive(products) {
        let len = products.length
        let filtered = products.filter(f => exchange.name === 'mexc' || f.active)
        debug.msg('filter '.cyan + (len) + " " + filtered.length.toString().green + ' symbols with active'.cyan)
        return filtered
    }
    function filterWithoutMargin(products) {
        let len = products.length
        let filtered = products.filter(symbol => {
            let res = (symbol.asset.lastIndexOf('UP') < 0 && symbol.asset.lastIndexOf('DOWN') < 0)
            res = res && !/(\d+)[S|L]$/.test(symbol.asset)
            return res
        })
        debug.msg('filter '.cyan + (len) + " " + filtered.length.toString().green + ' symbols without eft '.cyan)
        return filtered
    }
    function filterMinVolume(products, min_volume = 0, cb) {
        exchange.getTickers(products, (err, realTickers) => {
            // console.log('realTickers', realTickers['ETH/USDT'])
            if (err) {
                return
            }
            let len = products.length
            let filtered = products.filter(symbol => {

                let symbolLabel = symbol.label
                if (exchange.name === 'binanceusdm')
                    symbolLabel = symbol.label + ':USDT'
                // console.log('symbol.label', symbolLabel, realTickers[symbolLabel])
                if (realTickers[symbolLabel]) {
                    symbol.volume = realTickers[symbolLabel].baseVolume * realTickers[symbolLabel].close
                    return realTickers[symbolLabel].baseVolume * realTickers[symbolLabel].close > min_volume
                }
                else {
                    return false
                }
            })
            debug.msg('filter '.cyan + (len) + " " + filtered.length.toString().green + ' symbols with min_volumne > '.cyan + min_volume.toString().green)
            cb(filtered)
        })
    }
    options = Object.assign({ currency: 'USDT', without_margin: true, min_volume: 0, active: true }, options)
    let filtered = []
    if (options.active) {
        filtered = filterActive(products)
    }
    if (options.currency) {
        filtered = filterCurrency(filtered, options.currency)
    }
    if (options.without_margin) {
        filtered = filterWithoutMargin(filtered)
    }
    if (options.min_volume) {
        filterMinVolume(filtered, options.min_volume, (filter2) => {
            //  console.log('prodd.len', filter2.length)
            if (cb) cb(filter2)
        })
    } else {
        if (cb) cb(filtered)
        //  console.log('prodd.len', products.length)
    }
}