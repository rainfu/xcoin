# Quick Start

## Setp 1 Requirements

- Windows / Linux / macOS 10 (or Docker)
- [Node.js](https://nodejs.org/) (version 12.0.0 or higher) and [MongoDB](https://www.mongodb.com/).

## Setp 2 Install

  run in terminal,

```bash
git clone https://github.com/rainfu/xcoin.git
```

Or, to download directly,

```bash
wget https://github.com/rainfu/xcoin/archive/master.tar.gz
tar -xf master.tar.gz
mv xcoin-master xcoin
```

Create your security configuration file `config/conf-secret-sample.js` to `config/conf-secret.js`:

```bash
cp conf --secret-sample.js conf.js
```

- Add database, third-party exchange API and other necessary data, security has been seen, please do not provide transfer function in third-party API
- View and edit `conf-base.js` to suit your trading habits.
- View and edit `conf-future.js` to suit your futures trading habits.
- If you need to use a separate price update thread, please modify conf-server.js
- If you need to use [PM2](https://pm2.keymetrics.io/) to manage your threads, please view or edit `binane.config.js`

Initialize the project:

```bash
cd xcoin
yarn
```

## Some common commands

Get help:

```bash
node ./xcoin --help
```

List all trading strategies:

```bash
node ./xcoin strategies
```

Get your assets on an exchange

```bash
node ./xcoin exchange binance --balance
```

## Run XCoin

The following command will simulate two trading pairs of BTC and ETH on Binance Exchange.

```bash
node ./xcoin trade binance --watch-symbols binance.BTC-USDT,ETH-USDt --paper
```

You can also use the yarn command directly, both have the same effect

```bash
yarn trade binance --watch-symbols binance.BTC-USDT,ETH-USDt --paper
```

Use the `--paper` flag to decide whether to trade live or paper.

Use the `--trade_type` flag to identify how the trading bot will trade, including

- auto automatic trading

- autoBuy buy automatically

- autoSell automatically sell

- manual

Use the `--conf` flag to identify the configuration file used by the trading robot, which will override the `conf-base.js` configuration file

The following command will trade the settings under the specified configuration file

```bash
yarn trade binance --conf ./data/config/binance/30mf.json
```

For more transaction parameters that can be brought by the command line, please refer to the commands/trade.js file. All transaction references can be set directly in the config file

```bash
yarn trade --help
````
