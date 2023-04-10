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

/** 
 * {
    "exchange_id": "bitopro",
    "product_id": "BTC-USDT",
    "asset": "BTC",
    "currency": "USDT",
    "normalized": "bitopro.BTC-USDT",
    "id": "btc_usdt",
    "active": true,
    "min_size": "0.0001",
    "increment": "0.01",
    "asset_increment": "0.00000001",
    "label": "BTC/USDT",
    "balance": {
        "asset": 0,
        "currency": 1000,
        "leverage": 10,
        "asset_hold": 0,
        "currency_hold": 0
    },
    "index": 1,
    "_period": "1m",
    "asset_capital": 0,
    "lookback": [
        {
            "period_id": "m27966317",
            "time": 1677979020000,
            "size": "1m",
            "close_time": 1677979019999,
            "open": 22396.67,
            "high": 22462,
            "low": 22396.67,
            "close": 22462,
            "volume": 0.10104443,
            "strategy": {}
        }
    ],
    "day_count": 1,
    "last_trade_id": 0,
    "my_trades": [],
    "loss_stop_buy_num": 0,
    "usdtProfit": 0,
    "dynamicProfit": 0,
    "dynamicUsdtProfit": 0,
    "profit": 0,
    "last_day": 5,
    "init_price": 22462,
    "in_preroll": false,
    "period": {
        "period_id": "m27966350",
        "size": "1m",
        "time": 1677981000000,
        "open": 22596.08,
        "high": 22596.08,
        "low": 22584.5,
        "close": 22584.5,
        "volume": 0,
        "close_time": 1677981059999,
        "latest_trade_time": 1677981054765,
        "strategy": {
            "bollingerbands": {
                "middle": 22588.69142857148,
                "upper": 22673.05157004473,
                "lower": 22504.331287098234,
                "pb": 0.47515752997634386
            }
        }
    },
    "quote": {
        "bid": 22600.78,
        "ask": 22600.78
    },
    "start_price": 22600.78,
    "signal": null,
    "inSignal": "long",
    "last__type": "bollingerbands__long",
    "last_period_id": "m27966350"
}
*/
module.exports = {
    getRefreshData,
    getInitData,
    getBacktestData
}