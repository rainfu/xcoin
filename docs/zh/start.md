# 快速开始

## 第一步 需求

- Windows / Linux / macOS 10 (or Docker)
- [Node.js](https://nodejs.org/) (version 12.0.0 or higher) and [MongoDB](https://www.mongodb.com/).

## 第二步 安装

 在终端中运行,

```bash
git clone https://github.com/rainfu/xcoin.git
```

或者，直接下载,

```bash
wget https://github.com/rainfu/xcoin/archive/master.tar.gz
tar -xf master.tar.gz
mv xcoin-master xcoin
```

创建您的安全配置文件 `config/conf-secret-sample.js` to `config/conf-secret.js`:

```bash
cp conf--secret-sample.js conf.js
```

- 添加数据库，第三方交易所API等必要数据，安全已见，请不要在第三方API中提供转账功能
- 查看与编辑 `conf-base.js`以满足您的交易习惯.
- 查看与编辑 `conf-future.js` 以满足您的期货交易习惯.
- 如果您需要使用独立的价格更新线程，请修改conf-server.js
- 如果您需要使用 [PM2](https://pm2.keymetrics.io/) 来管理您的线程，请查看或编辑 `binane.config.js`

初始化项目:

```bash
cd xcoin
yarn
```

## 一些常见的命令

获得帮助:

```bash
node ./xcoin --help
```

列出所有的交易策略:

```bash
node ./xcoin strategies
```

获得某一交易所您的资产

```bash
node ./xcoin exchange binance --balance
```

## 运行XCoin

下面命令将模拟交易币安交易所的BTC与ETH两个交易对.

```bash
node ./xcoin trade binance --watch-symbols binance.BTC-USDT,ETH-USDt --paper
```

您也可以直接使用yarn 命令，两者效果相同

```bash
yarn trade binance --watch-symbols binance.BTC-USDT,ETH-USDt --paper
```

使用 `--paper` 标识来决定是真实交易还是模拟交易.

使用 `--trade_type` 标识来确认交易机器人进行交易的方式 ，包括

- auto 自动买卖

- autoBuy 自动买

- autoSell 自动卖

- manual 手动

使用 `--conf` 标识来确认交易机器人使用的配置文件，该配置文件将覆盖 `conf-base.js`配置文件

下列命令将交易指定配置文件下的设置

```bash
yarn trade binance --conf ./data/config/binance/30mf.json
```

更多命令行可带交易参数请查看 commands/trade.js 文件，所有交易参考均可直接在config文件中设定

```bash
yarn trade --help
```
