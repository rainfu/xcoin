/**
 * test ccxt function
 */
const ccxt = require('ccxt')
const test = async () => {
    // let exchanges = ['binanceusdm']
    // let exchanges = ccxt.exchanges

    const exchange = new ccxt.binanceusdm()
    const trades = await exchange.fetchTrades('BTC/USDT', undefined, 100)
    console.log(trades)
    /* const markKlines = await exchange.fetchOHLCV('ADA/USDT', '1h', undefined, 2, { 'price': 'mark' })
    console.log(markKlines)
    const indexKlines = await exchange.fetchOHLCV('ADA/USDT', '1h', undefined, 2, { 'price': 'index' })
    console.log(indexKlines)
    const premiumIndex = await exchange.fetchOHLCV('ADA/USDT', '1h', undefined, 2, { 'price': 'index' })
    console.log(premiumIndex) */
    return
    let exchanges = ['alpaca',
        'bitcoincom',
        'bitopro',
        'btctradeua',
        'coinspot',
        'flowbtc',
        'itbit',
        'mexc',
        'mexc3',
        'ndax',
        'novadax',
        'timex',
        'wavesexchange',
        'wazirx',
        'whitebit',
        'woo']
    for (let i in exchanges) {
        let exchange = new ccxt[exchanges[i]]
        // console.log('exchange,', exchanges[i])
        try {
            console.time(exchanges[i])
            let res = await exchange.loadMarkets({
                timeout: 3000
            })
            let btcusd = Object.keys(res).find(f => f.indexOf('DUSK/USD') === 0)
            if (!btcusd) {
                btcusd = Object.keys(res).find(f => f.indexOf('BTC/USD') === 0)
            }
            if (!btcusd) {
                btcusd = Object.keys(res).find(f => f.indexOf('/USD') >= 0)
            }
            if (!btcusd) {
                btcusd = Object.keys(res)[0]
            }
            let date = (new Date)
            date.setDate(date.getDate() - 1)
            let time = date.getTime()
            // console.log('date', date.toString())
            let res2 = await exchange.fetchOHLCV(btcusd, '1h', time, 1000)
            if (res2) {
                console.log(exchanges[i], 'fetchOHLCV', Object.keys(res).length, btcusd, date.toString(), res2.length, res2[0], res2[1], (res2[1][0] - res2[0][0]) / 1000)
            }
            console.timeEnd(exchanges[i])
        } catch (e) {
            //  console.log(exchange.id, 'error', e)
        }
    }
}
test()

/**ok
 * alpaca 47 ok
bit2c 4 ok
bitcoincom 637 ok
bitopro 46 ok
bitpanda 53 ok
bitso 79 ok
bitstamp1 12 ok
bl3p 1 ok
blockchaincom 162 ok
btcbox 4 ok
btcex 212 ok
btctradeua 17 ok
coincheck 5 ok
coinex 1043 ok
coinspot 14 ok
cryptocom 605 ok
delta 642 ok
deribit 1324 ok
flowbtc 26 ok
fmfwio 637 ok
gate 3198 ok
gateio 3198 ok
hollaex 34 ok
itbit 9 ok
mexc 2118 ok
mexc3 2309 ok
ndax 41 ok
novadax 231 ok
paymium 1 ok
phemex 639 ok
timex 50 ok
wavesexchange 111 ok
wazirx 629 ok
whitebit 333 ok
woo 154 ok
 */
