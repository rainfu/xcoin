<p align="center"><img src="docs/public/images/logo.png" alt="XCoin" width="100" height="100"></p>

<h1 align="center">XCoin</h1>

<h4 align="center">Next Generation Trading Bot Based On Nodejs,CCXT,DEFI</h4>

**A simple and powerful trading bot based on nodejs**

> server side: nodejs+mongodb;
>
> client side: Android,Ios, Linux, macOS and Windows.
>
> support exchagne: CCXT, binance and mexc...;DEFI,uniswap and pancakeswap...

## Screenshots

### Server

![Screenshot](docs/public/images/server.jpg)

### Client

![Screenshot](docs/public/images/screenshot.jpg)

## Features

- Support watching pool to trading multiple pairs at the same time, if you want,you can trade all pairs within a exchange.

- Support all exchanges supported by [ccxt](https://github.com/ccxt/ccxt), [Binance](https://www.binance.com),[BinanceUsdm](https://www.binance.com), [Mexc](https://www.mexc.com/) have been fully tested.

- Support defi exchanges like [Pancakeswap](https://www.pancakeswap.finance),[Uniswap](https://www.uniswap.org),easy to extend your custom defi exchange.

- Support all trading strategies supported by [technicalindicators](https://github.com/anandanand84/technicalindicators), easily extend new strategies through JSON files.

- Supports futures trading and can control whether it is long or short or both trading.

- Support multiple trading methods, automatic buying, manual buying, manual selling or full manual mode.

- Supports monitoring of purchased items, blacklist, and dynamic addition of monitoring items

- Support getting price updates on a separate thread, and support deploying multiple bots on the same machine on the same exchange.

- Support real transactions, virtual transactions and backtest transactions

- Support blacklist and whitelist, ensure orderly progress of quantitative and non quantitative transactions

- Support all mobile devices and desktop devices through [Panacea](https://github.com/markmind/panacea-api), control all the states and operations of the bot in real time

- Based on [Zenbot](https://github.com/DeviaVir/zenbot), Supports most of the functions of zenbot.

## Install and Run

### Install

```bash
git clone https://github.com/rainfu/xcoin.git
```

### Run

Run a trading bot with two pairs and a config file in  debug mode

```bash
yarn trade binance --watch-symbols binance.BTC-USDT,binance.ETH-USDT --conf ./data/config/binance/30mf.json --debug
```

Learn how to configure and start your XCoin program with the [Beginner's Guide](docs/start.md)

Learn how to manage your bot's real-time status with the [Panacea](https://github.com/markmind/panacea-api) guide

## Documentation

You can learn about XCoin and participate in making XCoin better through user documentation and developer documentation.

- [User Documentation](docs/README.md)
- [Developer Documentation](docs/developer.md)

If you have problems and bugs, please submit them through Github, We will try our best to answer your questions in time. Of course, it would be greatly appreciated if you could submit a PR directly.

You can click here to view the [中文](README.zh-CN.md) document

## Contributors

Thanks to all contributors [[contributors](https://github.com/rainfu/xcoin/graphs/contributors)] who participated to XCoin project.

## License

[**MIT**](https://opensource.org/licenses/MIT).
