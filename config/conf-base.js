//db
const db = {
    // mongo configuration
    mongo: {
        db: 'xcoin'
    }
}
const output = {
    // cross platform client panacea api
    panacea: {
        on: true,
        ip: '0.0.0.0',
        port: 17800
    }
}
const server = {
    ip: '127.0.0.1',
    port: 17988,
    save_pairs: 'binanceusdm.BTC-USDT,binanceusdm.DOGE-USDT',
    db: 'tickers'
}
const options = {
    name: "xcoin",
    watch_symbols: 'binance.BTC-USDT',
    user: 'rain',
    exchange: "binance",
    strategy: 'PSAR',
    period: '1d',
    min_periods: 32,
    future: false,
    trade_type: 'auto',
    market: 'only_long',
    sell_stop_pct: 5,// sell if price drops below this % of bought price (0 to disable)
    buy_stop_pct: 0,// buy if price surges above this % of sold price (0 to disable)
    max_slippage_pct: 0.5,// avoid trading at a slippage above this pct
    buy_pct: 20,// buy with this % of currency balance (WARNING : sim won't work properly if you set this value to 100)
    max_buy_size: 0,//every time buy with this size
    sell_pct: 100,// sell with this % of asset balance (WARNING : sim won't work properly if you set this value to 100)
    order_adjust_time: 5000,// ms to adjust non-filled order after
    max_sell_loss_pct: 0,// avoid selling at a loss below this pct set to 0 to ensure selling at a higher price...
    max_buy_loss_pct: 0,// avoid buying at a loss above this pct set to 0 to ensure buying at a lower price...
    order_poll_time: 3000,// ms to poll order status
    wait_for_settlement: 5000,// ms to wait for settlement (after an order cancel)
    markdown_buy_pct: 0,// % to mark down buy price for orders
    markup_sell_pct: 0,// % to mark up sell price for orders
    order_type: 'maker',// become a market taker (high fees) or a market maker (low fees)
    post_only: false,// when supported by the exchange, use post only type orders.
    use_fee_asset: false,// use separated fee currency such as binance's BNB.
    days: 2,// default # days for backfill and sim commands
    keep_lookback_periods: 1000,// defaults to a high number of lookback periods
    poll_scan_time: 10000,// ms to poll new klines at
    currency_capital: 1000,// amount of currency to start simulations with
    asset_capital: 0,// amount of asset to start simulations with
    avg_slippage_pct: 0.045,// avg. amount of slippage to apply to sim trades
    cancel_after: 'day',// time to leave an order open, default to 1 day (this feature is not supported on all exchanges, currently: GDAX)
    save_bot_time: 60000,// seconds to auto save status 
    min_buy_size: 10,
    max_watch_size: 10,
    price_format: '0.00000000',
    quarentine_time: 0,
    run_for: 0,
    profit_not_lost: true,
    profit_win_enable: true,
    profit_win_first_rate: 10,
    profit_win_first_percent: 25,
    profit_win_second_rate: 20,
    profit_win_second_percent: 36,
    profit_win_third_rate: 50,
    profit_win_third_percent: 50,
    profit_win_max_rate: 100,
    profit_win_max_percent: 50,
    profit_stop_enable: true,   // enable trailing sell stop when reaching this % profit (0 to disable)
    profit_stop_pct: 20,// maintain a trailing stop this % below the high-water mark of profit
    profit_stop_first_rate: 10,
    profit_stop_first_percent: 30,
    profit_stop_second_rate: 20,
    profit_stop_second_percent: 40,
    profit_stop_third_rate: 30,
    profit_stop_third_percent: 50,
    profit_stop_max_rate: 50,
    profit_stop_max_percent: 70,
    profit_stop_percent: 50,
    watch_include_bought: true,
    watch_with_black_list: true,
    black_list: '',
    with_server: false,
    poll_broadcast_time: 5000,
    poll_watch_wait: 1000,
    poll_init_klines: 1500,
    buy_profit_pct: 0,
    max_check_order_num: 10,
    product_active: true,
    paper: false,
    product_currency: "USDT",
    product_min_volume: 50000,
    product_without_margin: true,
    same_period_multi_buy: false,
    buy_position_side_when_sell: true,
    short_buy_pct: 10
}
var c = {
    output,
    db,
    server
}
module.exports = Object.assign(c, options)