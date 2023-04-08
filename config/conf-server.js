/**
 * if you want use a thread to watch tickers alone
 */
module.exports = {
    poll_scan_time: 3000,
    poll_watch_wait: 1000,
    db: {
        mongo: {
            db: "xcoin"
        }
    },
    server: {
        port: 17810,
        save_pairs: "binanceusdm.BTC-USDT,binanceusdm.DOGE-USDT"
    }
}