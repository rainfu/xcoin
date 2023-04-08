<p align="center"><img src="docs/public/images/logo.png" alt="XCoin" width="100" height="100"></p>

<h1 align="center">XCoin</h1>

<h4 align="center">下一代智能交易机器人</h4>

**基于nodejs的简洁强大的交易机器人**

> 服务器端: nodejs+mongodb ;  
>
> 可选客户端: Android,Ios, Linux, macOS and Windows.

</a>

## 屏幕截图

![Screenshot](docs/public/images/screenshot_zh.jpg)

## 功能特征

- 支持同时交易多个交易对，只要服务器有足够算力，理论上你可以同时交易所有交易对.

- 支持 [ccxt](https://github.com/ccxt/ccxthttps://github.com/ccxt/ccxt) 支持的所有交易所，[Binance](https://www.binance.com),[BinanceUsdm](https://www.binance.com),[Mexc](https://www.mexc.com/)已完整测试.

- 支持 [technicalindicators](https://github.com/anandanand84/technicalindicators) 支持的所有交易策略，轻松通过JSON文件扩展新的策略.

- 支持期货交易并可控制是多空双方还是仅交易多方，空方.

- 支持多种交易方式，自动买，手动买，手动卖或完全手动模式.

- 支持监控已购项目，支持黑名单，支持动态添加监控项目

- 支持在单独线程上获取价格更新，支持同一机器同一交易所部署多个机器人.

- 支持真实交易，虚拟交易及对交易进行回测

- 通过 [灵丹](https://github.com) 支持所有移动设备与桌面设备，实时控制机器人的全部状态与操作

- 基于 [Zenbot](https://github.com/DeviaVir/zenbot) ，支持 zenbot 的绝大部分功能.

## 安装与运行

### 安装

```bash
git clone https://github.com/rainfu/xcoin.git
```

### 运行

下列指令将运行一个包括两个交易对，一个指定的配置文件的交易机器人，使用调试模式

```bash
yarn trade binance --watch-symbols binance.BTC-USDT,binance.ETH-USDT --conf ./data/config/binance/30mf.json --debug
```

通过 [新手指南](docs/zh/start.md) 了解如何配置与启动您的XCoin程序

通过 灵丹 指南 了解如何管理您的机器人的实时状态

## 文档

您可以通过用户文档与开发者文档了解XCoin的运行机制及参与让XCoin变的更美好.

- [用户文档](docs/zh/README.md)

- [开发者文档](docs/zh/developer.md)

如果您有使用上的问题与Bug，欢迎通过 Github 提交，我们会尽量及时回答您的问题。当然，如果您能够直接提交PR，我们将不胜感谢。

您可以点击这儿查看 [English](README.md) 文档

## 贡献者

感谢所有参与XCoin项目的贡献者[[贡献者](https://github.com/xcoin/xcoin/graphs/contributors)].

## License

[**MIT**](LICENSE).
