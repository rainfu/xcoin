# Exchange

XCoin supports all exchanges supported by [ccxt](https://github.com/ccxt/ccxt) (more than 100 types), and through the packaging of ccxt/exchange.js, it can handle almost all data required for transactions. Currently we have Binance, BinanceUSDM, and Mexc have passed the test. You can also try other exchanges such as OKEX, HuoBi, etc.

At the same time, when simulating or backtesting transactions, XCoin supports obtaining historical or real-time data through sim/exchange.js to complete the simulation or backtest transaction process

We are also considering adding a DEFI type exchange based on pancakswap, so stay tuned.

## Introduction

### ccxt

Supports nearly a hundred mainstream exchanges that obtain data through the [ccxt](https://github.com/ccxt/ccxt) module. Through the api key provided by the user, the exchange can pass through three modes: anonymous, user authentication, and websocket authentication Get the data, you can call it conveniently as needed

### sim

Simulated exchange, used to support simulated and backtested transactions

## Add new exchange

XCoin initializes the exchange through the following methods

```javascript
try {
       if (so. mode !== 'live') {
         s.exchange = require(path.resolve(__dirname, '../extensions/exchanges/sim/exchange'))(conf, so, s)
       }
       else {
         s.exchange = require(path.resolve(__dirname, `../extensions/exchanges/${so.exchange}/exchange`))(conf, so)
       }
     } catch (e) {
      if (so.defi) {
        s.exchange = require(path.resolve(
          __dirname,
          "../extensions/exchanges/defi/exchange"
        ))(conf, so);
      } else {
       if (so.defi) {
          s.exchange = require(path.resolve(
            __dirname,
            "../extensions/exchanges/defi/exchange"
          ))(conf, so);
        } else {
          s.exchange = require(path.resolve(
            __dirname,
            "../extensions/exchanges/ccxt/exchange"
          ))(conf, so);
        }
      }
     }
```

If ccxt/exchange.js does not meet your requirements, you can add a new exchange name under extensions/exchange and add the exchange.js file under exchanges

- If the exchange is based on ccxt, you only need to adjust the details part

- If the exchange is based on other APIs, you need to implement the necessary functions provided by the CCXT exchange
