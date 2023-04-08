module.exports = function profit(s) {
    return {
        getProfitStopPrice: function (symbol) {
            let profit_stop = 0
            if (s.symbols[symbol.product_id].profit_stop_high > (s.options.profit_stop_max_rate / 100)) {
                profit_stop = s.symbols[symbol.product_id].profit_stop_high * s.options.profit_stop_max_percent / 100
            } else if (s.symbols[symbol.product_id].profit_stop_high > (s.options.profit_stop_third_rate / 100)) {
                profit_stop = s.symbols[symbol.product_id].profit_stop_high * s.options.profit_stop_third_percent / 100
            }
            else if (s.symbols[symbol.product_id].profit_stop_high > (s.options.profit_stop_second_rate / 100)) {
                profit_stop = s.symbols[symbol.product_id].profit_stop_high * s.options.profit_stop_second_percent / 100
            }
            else if (s.symbols[symbol.product_id].profit_stop_high > (s.options.profit_stop_first_rate / 100)) {
                profit_stop = s.symbols[symbol.product_id].profit_stop_high * s.options.profit_stop_first_percent / 100
            }
            return profit_stop
        },
        checkProfitStop: function (symbol) {
            //  console.log(`\ngetProfitStopPrice- profit_stop_type':${s.options.profit_stop_type}", last_trade_worth:${s.symbols[symbol.product_id].last_trade_worth},profit_stop:${s.symbols[symbol.product_id].profit_stop}`)
            let stop_signal = s.symbols[symbol.product_id].profit_stop && s.symbols[symbol.product_id].last_trade_worth < s.symbols[symbol.product_id].profit_stop && s.symbols[symbol.product_id].last_trade_worth > 0
            if (!stop_signal && s.symbols[symbol.product_id].profit_stop && s.options.profit_not_lost) {
                stop_signal = s.symbols[symbol.product_id].last_trade_worth <= 0.005
                if (s.options.future) {
                    stop_signal = s.symbols[symbol.product_id].last_trade_worth <= 0.02
                }
            }
            return stop_signal
        },
        checkProfitWin: function (symbol) {
            let stop_signal = false
            //  console.log('s.symbols[symbol.product_id].profit_stop_high', s.symbols[symbol.product_id].profit_stop_high)
            // console.log('\nprofit_win_first_rate', s.symbols[symbol.product_id].action, s.options.profit_win_first_rate / 100, s.symbols[symbol.product_id].last_trade_worth, s.symbols[symbol.product_id].last_trade_worth >= s.options.profit_win_first_rate / 100)
            if (!s.symbols[symbol.product_id].has_profit_win_first_sell && (s.symbols[symbol.product_id].action && (s.symbols[symbol.product_id].action === 'partSell' || s.symbols[symbol.product_id].action === 'bought')) && s.options.profit_win_first_rate && s.symbols[symbol.product_id].last_trade_worth >= s.options.profit_win_first_rate / 100) {
                stop_signal = true
                s.symbols[symbol.product_id].has_profit_win_first_sell = true
                s.symbols[symbol.product_id].inSignal = (s.symbols[symbol.product_id].last_buy_type && s.symbols[symbol.product_id].last_buy_type.indexOf('short') >= 0 ? 'short' : 'long')
                s.symbols[symbol.product_id].last_sell_type = 'profit_win_first_sell_' + (s.symbols[symbol.product_id].last_buy_type && s.symbols[symbol.product_id].last_buy_type.indexOf('short') >= 0 ? 'short' : 'long')
            } else if (!s.symbols[symbol.product_id].has_profit_win_second_sell && (s.symbols[symbol.product_id].action && (s.symbols[symbol.product_id].action === 'partSell' || s.symbols[symbol.product_id].action === 'bought')) && s.options.profit_win_second_rate && s.symbols[symbol.product_id].last_trade_worth >= s.options.profit_win_second_rate / 100) {
                stop_signal = true
                s.symbols[symbol.product_id].has_profit_win_second_sell = true
                s.symbols[symbol.product_id].inSignal = (s.symbols[symbol.product_id].last_buy_type && s.symbols[symbol.product_id].last_buy_type.indexOf('short') >= 0 ? 'short' : 'long')
                s.symbols[symbol.product_id].last_sell_type = 'profit_win_second_sell_' + (s.symbols[symbol.product_id].last_buy_type && s.symbols[symbol.product_id].last_buy_type.indexOf('short') >= 0 ? 'short' : 'long')
            } else if (!s.symbols[symbol.product_id].has_profit_win_third_sell && (s.symbols[symbol.product_id].action && (s.symbols[symbol.product_id].action === 'partSell' || s.symbols[symbol.product_id].action === 'bought')) && s.options.profit_win_third_rate && s.symbols[symbol.product_id].last_trade_worth >= s.options.profit_win_third_rate / 100) {
                stop_signal = true
                s.symbols[symbol.product_id].has_profit_win_third_sell = true
                s.symbols[symbol.product_id].inSignal = (s.symbols[symbol.product_id].last_buy_type && s.symbols[symbol.product_id].last_buy_type.indexOf('short') >= 0 ? 'short' : 'long')
                s.symbols[symbol.product_id].last_sell_type = 'profit_win_third_sell_' + (s.symbols[symbol.product_id].last_buy_type && s.symbols[symbol.product_id].last_buy_type.indexOf('short') >= 0 ? 'short' : 'long')
            } else if (!s.symbols[symbol.product_id].has_profit_win_max_sell && (s.symbols[symbol.product_id].action && (s.symbols[symbol.product_id].action === 'partSell' || s.symbols[symbol.product_id].action === 'bought')) && s.options.profit_win_max_rate && s.symbols[symbol.product_id].last_trade_worth >= s.options.profit_win_max_rate / 100) {
                stop_signal = true
                s.symbols[symbol.product_id].has_profit_win_max_sell = true
                s.symbols[symbol.product_id].inSignal = (s.symbols[symbol.product_id].last_buy_type && s.symbols[symbol.product_id].last_buy_type.indexOf('short') >= 0 ? 'short' : 'long')
                s.symbols[symbol.product_id].last_sell_type = 'profit_win_max_sell_' + (s.symbols[symbol.product_id].last_buy_type && s.symbols[symbol.product_id].last_buy_type.indexOf('short') >= 0 ? 'short' : 'long')
            }
            return stop_signal
        }
    }
}
