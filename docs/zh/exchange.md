# 交易所

XCoin支持 [ccxt](https://github.com/ccxt/ccxt) 支持的所有交易所（超过100种），通过ccxt/exchange.js 的包装，能够处理几乎所有交易所需数据，目前我们已经测试通过的 Binance, BinanceUSDM,Mexc，您也可以试试其它交易所如OKEX，HuoBi等。
同时，在模拟或回测交易时，XCoin支持通过sim/exchange.js 获得历史或实时数据来完成模拟或回测交易流程
我们同时也在考虑添加一个基于pancakswap的DEFI类型的交易所,敬请期待.

## 现有交易所介绍

### ccxt

支持通过 [ccxt](https://github.com/ccxt/ccxt) 模块获取数据的近百个主流交易所，通过用户提供的api key，交易所可通过匿名，用户认证，websocket认证三种模式获得数据，您可以根据需要便捷地进行调用

### defi

支持主流Defi交易所如  [pancakeswap](https://www.pancakeswap.finance) 和 [uniswap](https://www.uniswap.org)，支持实时自动添加新的活跃代币。 您也可以根据需要便捷地扩展其它defi交易所

### sim

模拟交易所，用于支持模拟与回测交易

## 添加新的交易所

XCoin通过如下方法初始化交易所

```javascript
try {
      if (so.mode !== 'live') {
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
          s.exchange = require(path.resolve(
            __dirname,
            "../extensions/exchanges/ccxt/exchange"
          ))(conf, so);
        }
    }
```

如果ccxt/exchange.js不符合您的要求，您可以在 extensions/exchange下添加新的交易所名称，并在交易所下添加exchange.js文件

- 如果交易所基于ccxt，您只需对细节部分进行调整即可

- 如果交易所基于其它API，您需要实现CCXT交易所提供的必要函数的实现
