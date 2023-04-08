<p align="center"><img src="docs/public/images/logo.png" alt="XCoin" width="100" height="100"></p>

<h1 align="center">XCoin</h1>

<h4 align="center">Next Generation Trading Bot</h4>

**A simple and powerful trading bot based on nodejs**

> server side: nodejs+mongodb;
>
> client side: Android,Ios, Linux, macOS and Windows.

## Screenshots

### Desktop

![Screenshot](docs/public/images/screenshot.jpg)

### Mobile

![Screenshot](docs/public/images/screenshot_mobile.jpg)

## Features

- Support trading multiple trading pairs at the same time, as long as the server has enough computing power, theoretically you can trade all trading pairs at the same time.

- Support all exchanges supported by [ccxt](https://github.com/ccxt/ccxt), [Binance](https://www.binance.com),[BinanceUsdm](https://www.binance.com), [Mexc](https://www.mexc.com/) have been fully tested.

- Support all trading strategies supported by [technicalindicators](https://github.com/anandanand84/technicalindicators), easily extend new strategies through JSON files.

- Supports futures trading and can control whether it is long or short or both trading.

- Support multiple trading methods, automatic buying, manual buying, manual selling or full manual mode.

- Supports monitoring of purchased items, blacklist, and dynamic addition of monitoring items

- Support getting price updates on a separate thread, and support deploying multiple bots on the same machine on the same exchange.

- Support real transactions, virtual transactions and backtest transactions

- Support all mobile devices and desktop devices through [Panacea](https://github.com/markmind/panacea), control all the states and operations of the bot in real time

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

Learn how to manage your bot's real-time status with the [Panacea](https://github.com/markmind/panacea) guide

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
