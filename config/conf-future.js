module.exports = {
    name: "future",
    db: {
        mongo: {
            db: 'future'
        }
    },
    watch_symbols: 'binanceusdm.BTC-USDT',
    market: 'both',
    future: true,
    poll_scan_time: 3000,
    sell_stop_pct: 1,
    max_slippage_pct: 0.2,
    max_buy_size: 1000,
    profit_win_first_rate: 10,
    profit_win_first_percent: 50,
    profit_win_second_rate: 20,
    profit_win_second_percent: 50,
    profit_win_third_rate: 30,
    profit_win_third_percent: 50,
    profit_win_max_rate: 50,
    profit_win_max_percent: 50,
    leverage: 10,
    isolated: false
}