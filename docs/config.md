# Configuration

XCoin initializes bots through configuration files, including the following types of configuration files

## Configuration file path

### config subfolder

- conf-base.js basic configuration

- conf-secret.js security configuration

- conf-server.js server configuration

- conf-future.js futures basic configuration

### data/config subfolder

- Profiles that store all user settings

- Store the configuration file last_config.json of the last run

The configuration file can be modified in real time through the client, and the modification of some core parameters requires restarting the bot. For details, please refer to [pm2 management bot](pm2.md)

## Configuration file loading process

  The loading process of the configuration file is as follows

1. Load the initial configuration file, /config/conf-base.js to get all the initial configuration
2. Load the specified configuration file: the configuration file specified by `--conf` in the command line parameters and overwrite the initial configuration
3. Load the last used configuration file: If `--conf` does not specify a configuration file but /data/config/last_config.json exists, then load `last-config.json`
4. Load the configuration specified by the command line parameters. For example, if the user acts `yarn trade binance --paper --trade_type autoBuy`, then paper=true and trade_type='autoBuy' will become the preferred configuration

## Basic configuration

The basic configuration file is located in the /confg directory, and the file name is conf-base.js. The configuration parameters are divided into five parts: bots, exchanges, orders, selling points, and simulated transactions according to usage scenarios

```javascript
{
   bot: [//bot configuration
     {
       name: 'strategy', //Strategy
       type: 'string', // data type
       value: 'rain_sar', //value
     },
     {
       name: 'period',//K line period
       type: 'array',
       list: ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '8h', '12h', '1d', '3d' , '1w'],
       value: '30m',
     },
     {
       name: 'mode', //real or simulated transaction
       type: "array",
       list: ['live', 'paper'],
       value: 'live'
     },
     {
       name: 'trade_type',//automatic trading or manual or semi-manual trading
       type: "array",
       list: ['auto', 'autoBuy', 'autoSell', 'manual'],
       value: 'live'
     },
     {
       name: 'other', // other
       type: 'group', // group display
     },
     {
       name: 'poll_scan_time',//Price polling time interval
       type: 'number',
       step: [1000, 60000, 500],
       value: 3000,
       des: true
     },
     {
       name: 'poll_broadcast_time',//Using websocket mode, broadcast price round-robin time interval
       type: 'number',
       step: [3000, 60000, 1000],
       value: 5000,
       des: true
     },
     {
       name: 'save_bot_time',//The bot automatically saves the time interval
       type: 'number',
       step: [6000, 6000000, 6000],
       value: 600000,
       des: true
     },
     {
       name: 'min_periods',//Minimum number of preloading cycles
       type: 'number',
       step: [18, 500, 1],
       value: 32,
     }, {
       name: 'keep_lookback_periods',//The maximum number of retention periods
       type: 'number',
       step: [50, 50000, 10],
       value: 500
     }, {
       name: 'price_format',//price format
       type: 'string',
       value: '0.00000000',
     }, {
       name: "same_period_multi_buy",//Allow multiple transactions in the same period
       type: "bool",
       value: false
     }, {
       name: 'run_for', // bot running time limit
       type: "number",
       step: [0, 1000, 1],
       value: 0,
       des: true
     }],
   exchange: [//exchange related
     {
       name: 'exchange', // supported exchanges
       type: 'array',
       list: ['binanceusdm', 'binance', 'mexc'],
       value: 'binanceusdm'
     },
     {
       name: 'takerFee',//market rate
       type: "number",
       step: [0.001, 0.5, 0.001],
       value: 0.1,
     },
     {
       name: 'makerFee',//limit price rate
       type: "number",
       step: [0.001, 0.5, 0.001],
       value: 0.1,
     },
     {
       name: 'future',//futures grouping
       type: 'group',
     },
     {
       name: 'future', //whether it is futures
       type: 'bool',
       value: false,
       readonly: true
     },
     {
       name: 'market', // long and short trading restrictions
       type: 'array',
       list: ['only_long', 'only_short', 'both'],
       value: 'only_long'
     },
     {
       name: 'leverage', //leverage size
       type: 'number',
       step: [2, 125, 1],
       value: 10,
     },
     {
       name: 'marginMode',//position mode cross margin/isolated margin
       type: 'array',
       list: ['cross', 'isolated'],
       value: 'isolated',
     },
     {
       name: 'short_buy_pct',//buy short ratio
       type: "number",
       step: [0, 100, 1],
       value: 20,
     },
     {
       name: 'buy_position_side_when_sell',//reverse purchase when long-short conversion
       type: 'bool',
       value: false
     }
   ],
   order: [//order related
     {
       name: 'order_type', //order type
       type: "array",
       list: ['maker', 'taker'],
       value: 'maker'
     },
     {
       name: 'max_slippage_pct', //maximum slippage
       type: "number",
       step: [0.1, 2, 0.1],
       value: 0.5,
       group: 'core'
     },
     {
       name: "buy",
       type: 'group'
     },
     {
       name: 'buy_pct',//buy long ratio
       type: "number",
       step: [0, 100, 1],
       value: 20,
     },
     {
       name: 'min_buy_size',//minimum buy quantity
       type: "number",
       step: [0, 100, 1],
       value: 10,
     },
     {
       name: 'max_buy_size',//maximum buy quantity
       type: "number",
       step: [0, 10000, 100],
       value: 0,
     },
     {
       name: 'sell',
       type: "group"
     },
     {
       name: 'sell_pct',//sell percentage
       type: "number",
       step: [0, 100, 1],
       value: 100,
       group: "sell"
     },
     {
       name: 'other',
       type: 'group'
     },
     {
       name: 'order_adjust_time', //order adjustment time
       type: "number",
       step: [1000, 1000, 1000],
       value: 5000,
       group: "other"
     },
     {
       name: 'max_sell_loss_pct', // allow selling loss ratio
       type: "number",
       step: [0, 5, 0.5],
       value: 1,
       group: "other"
     },
     {
       name: 'max_buy_loss_pct', // allow buy loss ratio
       type: "number",
       step: [0, 5, 0.5],
       value: 1,
       group: "other"
     },
     {
       name: 'order_poll_time',//order status query time interval
       type: "number",
       step: [1000, 60000, 1000],
       value: 5000,
       group: "other"
     },
     {
       name: 'wait_for_settlement',//Waiting time when the order funds are insufficient
       type: "number",
       step: [1000, 60000, 1000],
       value: 5000,
       group: "other",
       des: true,
     },
     {
       name: 'markdown_buy_pct',//Buy price adjustment ratio
       type: "number",
       step: [0, 5, 0.1],
       value: 0,
       group: "other"
     },
     {
       name: 'markup_sell_pct',//Sell price adjustment ratio
       type: "number",
       step: [0, 5, 0.1],
       value: 0,
       group: "other"
     },
     {
       name: 'post_only', //POSTONLY order
       type: "bool",
       value: false,
       group: "other"
     },
     {
       name: 'use_fee_asset', // use third-party currency as the fee
       type: "bool",
       value: false,
       group: "other"
     },
     {
       name: 'avg_slippage_pct', //average slippage
       type: "number",
       value: 0.045,
       step: [0, 0.1, 0.005],
       group: "other"
     },
     {
       name: 'quarentine_time',//Cancel purchase time
       type: "number",
       step: [0, 100000, 1000],
       value: 0,
       group: "other"
     },
   ],
   sellPoint: [//selling point
     {
       name: 'sell_stop_pct',//stop loss ratio
       type: "number",
       step: [0, 30, 0.1],
       value: 5
     },
     {
       name: "profitStop",//callback stop profit
       type: 'group'
     },
     {
       name: 'profit_stop_enable',//Allow callback stop profit
       type: "bool",
       value: true
     },
     {
       name: 'profit_stop_percent',//Callback stop profit selling ratio
       type: "number",
       step: [0, 100, 1],
       value: 50
     },
     {
       name: 'profit_stop_first_rate',//First callback stop profit rate
       type: "number",
       step: [0, 500, 1],
       value: 10
     },
     {
       name: 'profit_stop_first_percent',//the first callback selling ratio
       type: "number",
       step: [0, 100, 1],
       value: 30
     },
     {
       name: 'profit_stop_second_rate',//the profit rate of the second callback stop profit
       type: "number",
       step: [0, 500, 1],
       value: 20
     },
     {
       name: 'profit_stop_second_percent',//second callback selling ratio
       type: "number",
       step: [0, 100, 1],
       value: 40
     },
     {
       name: 'profit_stop_third_rate',//The third callback stop profit rate
       type: "number",
       step: [0, 500, 1],
       value: 50
     },
     {
       name: 'profit_stop_third_percent',//The third callback selling ratio
       type: "number",
       step: [0, 100, 1],
       value: 50
     },
     {
       name: 'profit_stop_max_rate',//the profit rate of the fourth callback stop profit
       type: "number",
       step: [0, 500, 1],
       value: 100
     },
     {
       name: 'profit_stop_max_percent',//the fourth callback selling ratio
       type: "number",
       step: [0, 100, 1],
       value: 70
     },

     {
       name: "profitSell",//Target stop profit
       type: 'group'
     },
     {
       name: 'profit_win_enable',//allow the target to stop winning
       type: "bool",
       value: true
     },
     {
       name: 'profit_win_first_rate', //the first target profit rate
       type: "number",
       step: [0, 500, 1],
       value: 25
     },
     {
       name: 'profit_win_first_percent',//the first target selling ratio
       type: "number",
       step: [0, 100, 1],
       value: 50
     },
     {
       name: 'profit_win_second_rate',//second target profit rate
       type: "number",
       step: [0, 500, 1],
       value: 50
     },
     {
       name: 'profit_win_second_percent',//second target selling ratio
       type: "number",
       step: [0, 100, 1],
       value: 50
     },
     {
       name: 'profit_win_third_rate',//third target profit rate
       type: "number",
       step: [0, 500, 1],
       value: 100
     },
     {
       name: 'profit_win_third_percent',//The third target selling ratio
       type: "number",
       step: [0, 100, 1],
       value: 50
     },
     {
       name: 'profit_win_max_rate',//the fourth target profit rate
       type: "number",
       step: [0, 500, 1],
       value: 200
     },
     {
       name: 'profit_win_max_percent',//the fourth target selling ratio
       type: "number",
       step: [0, 100, 1],
       value: 50
     },
   ],
   watch: [
     {
       name: 'max_watch_size',//The maximum number of monitoring trading pairs
       type: "number",
       step: [0, 30, 5],
       value: 10,
     },
     {
       name: 'watch_symbols', // list of initial monitoring trading pairs
       type: "textarea",
       value: '',
       placeholder: true,
     },
     {
       name: 'watchInit',
       type: "group"
     },
     {
       name: 'watch_include_bought', //Initial monitoring includes purchased items
       type: "bool",
       value: true,
     },
     {
       name: 'watch_with_black_list', //Initial monitoring queuing blacklist items
       type: "bool",
       value: true,
     },
     {
       name: 'black_list', //blacklist
       type: "textarea",
       value: '',
       placeholder: true,
     }
   ],
   paper: [//Simulated transaction related
     {
       name: 'currency_capital',//Initial capital amount
       type: "number",
       step: [0, 10000, 1000],
       value: 1000,
     },
     {
       name: 'asset_capital',//Initial trading pair volume
       type: "number",
       step: [0, 10000, 1000],
       value: 0,
     }
   ]
}
```

## Security configuration

The security configuration file is located in the /config directory, the file name is config-secret.js, and the content is as follows

```javascript
const keys = {
     //pre defined api key for client app connect
     apiKey: 'YOUR API KEY FOR CLINET APP',//client authentication api key
     //exchange api key
     binance: {
         key: 'YOUR BINANCE API KEY', //your API KEY in Binance
         secret: 'YOUR BINANCE API SECRET',//Your Binance API SECRET
     },
     binanceusdm: {
         key: 'YOUR BINANCEUSDM API KEY',
         secret: 'YOUR BINANCEUSDM API SECRET',
         takerFee: 'YOUR BINANCEUSDM CUSTOM TAKER FEE', //custom taker fee for you
         makerFee: 'YOUR BINANCEUSDM CUSTOM MAKER FEE'//custom maker fee for you
     }
}
```

1. When using for the first time, please rename config-secret-sample.js to config-secret.js
2. The security configuration file contains three aspects, which need to be filled in, among which the third-party exchange API is required

    - Database configuration db
    - Third-party exchange API
    - Client connection apk key //The user needs to provide this api key when adding this bot on the client side to manage it in real time, otherwise it will be read-only even if it is added
3. If you need to use the new security configuration to override the initial value, you can submit the `--secret` command parameter

```bash
yarn trade binance --conf ./data/config/binance/spot.json --secret ./data/config/binance/secret.json
```

## Futures configuration

Futures configuration is a separate file config-future.js, based on the existence of futures leverage, this configuration file provides additional values for stop loss and some basic configuration options. If you build a futures-based trading bot, it is recommended that you override config-base with this configuration file.

## Price thread configuration

The price thread configuration is a separate file config-server.js. If your computer has limited computing power or you want to continuously load price data in an ultra-short time or you want to run multiple bots of the same exchange on the same machine (general exchanges will There is a fetchTickers time limit), it is recommended that you use a separate price thread to get real-time prices.

The price thread configuration is as follows

```javascript
/**
  * if you want to use a thread to watch tickers alone
  */
module.exports = {
     poll_scan_time: 3000,//Polling time interval
     poll_watch_wait: 1000,//When using websocket to get data, each delay time
     db: {
         mongo: {
             db: "xcoin"//save the database of transaction pairs
         }
     },
     server: {
         port: 17810,//The port of the price thread
         save_pairs: "binanceusdm.BTC-USDT,binanceusdm.DOGE-USDT"//Trading pairs saved in real time, use all to save all, mainly for backtesting
     }
}
```
