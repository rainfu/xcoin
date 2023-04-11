var config = require("../../../../config/config-structure.json")
/**
 * get real-time symbols data 
 * @param {*} s 
 * @returns 
 */
const getRefreshData = (s) => {
    let symbols = getSymbols(s, false)
    let output = {
        symbols,
        status: s.status
    }
    return output
}
/**
 * get bot init status with full symbols data and other data
 * @param {*} s 
 * @returns 
 */
const getInitData = (s) => {
    let symbols = getSymbols(s, true)
    let output = {
        strategies: s.strategies, // all strategies list
        exchange: s.exchange, // bot exchange info
        symbols, // symbols status data
        options: s.options, // bot config params
        status: s.status, // bot status,
        config: config
    }
    return output
}
/**
 * get data to save to database
 */
const getBacktestData = (s) => {
    let symbols = getSymbols(s, true)
    let output = {
        symbols,
        options: s.options,
        status: s.status
    }
    return output
}
/**
 * get all symbols status
 * @param {} s 
 * @param {*} init //if in init mode
 * @returns 
 */
const getSymbols = (s, init = false) => {
    return Object.keys(s.symbols).map(key => {
        const symbol = s.symbols[key]
        let output = {
            product_id: symbol.product_id,
            price: (symbol.period && symbol.period.close) || '',
            normalized: symbol.normalized,
            min_size: symbol.min_size,
            asset: symbol.asset,
            currency: symbol.currency,
            assetCaptial: symbol.asset_amount,
            leverage: symbol.leverage,
            isolated: symbol.isolated,
            usdtProfit: symbol.usdtProfit,
            dynamicProfit: symbol.dynamicProfit,
            dynamicUsdtProfit: symbol.dynamicUsdtProfit,
            profit: symbol.profit,
            signal: symbol.signal,
            win: symbol.win,
            lost: symbol.lost,
            winLostRate: symbol.winLostRate,
            action: symbol.buy_order ? 'buying' : (symbol.sell_order ? 'selling' : symbol.action),
            inSignal: symbol.inSignal,
            trades: symbol.my_trades,
            lastTradeTime: symbol.last_trade_time
        }
        if (init) {
            output.klines = symbol.lookback.map(p => {
                return p
            }).reverse()
        }
        else {
            output.kline = symbol.period
            // console.log(symbol.product_id, symbol.period.close, symbol.period.strategy)
        }
        /// console.log('output', output)
        // console.timeEnd('getSymbolData')
        return output
    })
}
module.exports = {
    getRefreshData,
    getInitData,
    getBacktestData
}