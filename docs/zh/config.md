# 配置

XCoin通过配置文件初始化机器人，包括以下几类配置文件

## 配置文件路径

### config子文件夹

- conf-base.js 基础配置

- conf-secret.js 安全配置

- conf-server.js 服务器配置

- conf-future.js 期货基础配置

### data/config 子文件夹

- 存放所有用户设定的配置文件

- 存放最后一次运行时的配置文件 last_config.json

配置文件可以通过客户端实时修改，部分核心参数的修改需要重新启动机器人，详情请参考 [pm2管理机器人](pm2.md)

## 配置文件加载流程

 配置文件的加载过程如下

1. 加载 初始配置文件，/config/conf-base.js获得所有初始配置

2. 加载指定配置文件：命令行参数中`--conf`指定的配置文件并覆盖初始配置

3. 加载上次使用配置文件 ：如果`--conf`未指定配置文件但 /data/config/last_config.json存在，则加载`last-config.json`

4. 加载命令行参数指定的配置，如用户作用`yarn trade binance --paper --trade_type autoBuy`,则paper=true与 trade_type='autoBuy'将成为首选配置

## 基础配置

基础配置文件位于/confg目录内，文件名为conf-base.js，配置参数按使用场景分为机器人，交易所、订单、卖点、模拟交易五个部分

```javascript
{
  bot: [//机器人配置
    {
      name: 'strategy',//策略
      type: 'string',//数据类型
      value: 'rain_sar',//值
    },
    {
      name: 'period',//K线周期
      type: 'array',
      list: ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '8h', '12h', '1d', '3d', '1w'],
      value: '30m',
    },
    {
      name: 'mode',//真实还是模拟交易
      type: "array",
      list: ['live', 'paper'],
      value: 'live'
    },
    {
      name: 'trade_type',//自动交易还是手动或半手动交易
      type: "array",
      list: ['auto', 'autoBuy', 'autoSell', 'manual'],
      value: 'live'
    },
    {
      name: 'debug',//调试模式是否开启
      type: "bool",
      value: false
    },
    {
      name: 'other',//其它
      type: 'group',//分组显示
    },
    {
      name: 'poll_scan_time',//价格轮循时间间隔
      type: 'number',
      step: [1000, 60000, 500],
      value: 3000,
      des: true
    },
    {
      name: 'poll_broadcast_time',//使用websocket模式式，广播价格轮循时间间隔
      type: 'number',
      step: [3000, 60000, 1000],
      value: 5000,
      des: true
    },
    {
      name: 'save_bot_time',//机器人自动保存时间间隔
      type: 'number',
      step: [6000, 6000000, 6000],
      value: 600000,
      des: true
    },
    {
      name: 'min_periods',//最小预加载周期数
      type: 'number',
      step: [18, 500, 1],
      value: 32,
    }, {
      name: 'keep_lookback_periods',//最多保留周期数
      type: 'number',
      step: [50, 50000, 10],
      value: 500
    }, {
      name: 'price_format',//价格格式化
      type: 'string',
      value: '0.00000000',
    }, {
      name: "same_period_multi_buy",//同一周期内允许多次交易
      type: "bool",
      value: false
    }, {
      name: 'run_for',//机器人运行时间限制
      type: "number",
      step: [0, 1000, 1],
      value: 0,
      des: true
    }],
  exchange: [//交易所相关
    {
      name: 'exchange',//支持的交易所
      type: 'array',
      list: ['binanceusdm', 'binance', 'mexc'],
      value: 'binanceusdm'
    },
    {
      name: 'takerFee',//市价费率
      type: "number",
      step: [0.001, 0.5, 0.001],
      value: 0.1,
    },
    {
      name: 'makerFee',//限价费率
      type: "number",
      step: [0.001, 0.5, 0.001],
      value: 0.1,
    },
    {
      name: 'future',//期货分组
      type: 'group',
    },
    {
      name: 'future',//是否为期货
      type: 'bool',
      value: false,
      readonly: true
    },
    {
      name: 'market',//多空交易限制
      type: 'array',
      list: ['only_long', 'only_short', 'both'],
      value: 'only_long'
    },
    {
      name: 'leverage',//杠杆大小
      type: 'number',
      step: [2, 125, 1],
      value: 10,
    },
    {
      name: 'marginMode',//仓位模式 全仓/逐仓
      type: 'array',
      list: ['cross', 'isolated'],
      value: 'isolated',
    },
    {
      name: 'short_buy_pct',//买空比率
      type: "number",
      step: [0, 100, 1],
      value: 20,
    },
    {
      name: 'buy_position_side_when_sell',//多空转换时反向购买
      type: 'bool',
      value: false
    }
  ],
  order: [//订单相关
    {
      name: 'order_type',//订单类型
      type: "array",
      list: ['maker', 'taker'],
      value: 'maker'
    },
    {
      name: 'max_slippage_pct',//最大滑点
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
      name: 'buy_pct',//买多比率
      type: "number",
      step: [0, 100, 1],
      value: 20,
    },
    {
      name: 'min_buy_size',//最小买入数量
      type: "number",
      step: [0, 100, 1],
      value: 10,
    },
    {
      name: 'max_buy_size',//最大买入数量
      type: "number",
      step: [0, 10000, 100],
      value: 0,
    },
    {
      name: 'sell',
      type: "group"
    },
    {
      name: 'sell_pct',//卖出百分比
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
      name: 'order_adjust_time',//订单调整时间
      type: "number",
      step: [1000, 1000, 1000],
      value: 5000,
      group: "other"
    },
    {
      name: 'max_sell_loss_pct',//允许卖出损失比率
      type: "number",
      step: [0, 5, 0.5],
      value: 1,
      group: "other"
    },
    {
      name: 'max_buy_loss_pct',//允许买入损失比率
      type: "number",
      step: [0, 5, 0.5],
      value: 1,
      group: "other"
    },
    {
      name: 'order_poll_time',//订单状态查询时间间隔
      type: "number",
      step: [1000, 60000, 1000],
      value: 5000,
      group: "other"
    },
    {
      name: 'wait_for_settlement',//订单资金不足时等待时间
      type: "number",
      step: [1000, 60000, 1000],
      value: 5000,
      group: "other",
      des: true,
    },
    {
      name: 'markdown_buy_pct',//买入价格调整比率
      type: "number",
      step: [0, 5, 0.1],
      value: 0,
      group: "other"
    },
    {
      name: 'markup_sell_pct',//卖出价格调整比率
      type: "number",
      step: [0, 5, 0.1],
      value: 0,
      group: "other"
    },
    {
      name: 'post_only',//POSTONLY订单
      type: "bool",
      value: false,
      group: "other"
    },
    {
      name: 'use_fee_asset',//使用第三方货币作为费率
      type: "bool",
      value: false,
      group: "other"
    },
    {
      name: 'avg_slippage_pct',//平均滑点
      type: "number",
      value: 0.045,
      step: [0, 0.1, 0.005],
      group: "other"
    },
    {
      name: 'quarentine_time',//取消购买时间
      type: "number",
      step: [0, 100000, 1000],
      value: 0,
      group: "other"
    },
  ],
  sellPoint: [//卖点
    {
      name: 'sell_stop_pct',//止损比率
      type: "number",
      step: [0, 30, 0.1],
      value: 5
    },
    {
      name: "profitStop",//回调止赢
      type: 'group'
    },
    {
      name: 'profit_stop_enable',//允许回调止赢
      type: "bool",
      value: true
    },
    {
      name: 'profit_stop_percent',//回调止赢卖出比率
      type: "number",
      step: [0, 100, 1],
      value: 50
    },
    {
      name: 'profit_stop_first_rate',//第一回调止赢利润率
      type: "number",
      step: [0, 500, 1],
      value: 10
    },
    {
      name: 'profit_stop_first_percent',//第一回调卖出比率
      type: "number",
      step: [0, 100, 1],
      value: 30
    },
    {
      name: 'profit_stop_second_rate',//第二回调止赢利润率
      type: "number",
      step: [0, 500, 1],
      value: 20
    },
    {
      name: 'profit_stop_second_percent',//第二回调卖出比率
      type: "number",
      step: [0, 100, 1],
      value: 40
    },
    {
      name: 'profit_stop_third_rate',//第三回调止赢利润率
      type: "number",
      step: [0, 500, 1],
      value: 50
    },
    {
      name: 'profit_stop_third_percent',//第三回调卖出比率
      type: "number",
      step: [0, 100, 1],
      value: 50
    },
    {
      name: 'profit_stop_max_rate',//第四回调止赢利润率
      type: "number",
      step: [0, 500, 1],
      value: 100
    },
    {
      name: 'profit_stop_max_percent',//第四回调卖出比率
      type: "number",
      step: [0, 100, 1],
      value: 70
    },

    {
      name: "profitSell",//目标止赢
      type: 'group'
    },
    {
      name: 'profit_win_enable',//允许目标止赢
      type: "bool",
      value: true
    },
    {
      name: 'profit_win_first_rate',//第一目标利润率
      type: "number",
      step: [0, 500, 1],
      value: 25
    },
    {
      name: 'profit_win_first_percent',//第一目标卖出比率
      type: "number",
      step: [0, 100, 1],
      value: 50
    },
    {
      name: 'profit_win_second_rate',//第二目标利润率
      type: "number",
      step: [0, 500, 1],
      value: 50
    },
    {
      name: 'profit_win_second_percent',//第二目标卖出比率
      type: "number",
      step: [0, 100, 1],
      value: 50
    },
    {
      name: 'profit_win_third_rate',//第三目标利润率
      type: "number",
      step: [0, 500, 1],
      value: 100
    },
    {
      name: 'profit_win_third_percent',//第三目标卖出比率
      type: "number",
      step: [0, 100, 1],
      value: 50
    },
    {
      name: 'profit_win_max_rate',//第四目标利润率
      type: "number",
      step: [0, 500, 1],
      value: 200
    },
    {
      name: 'profit_win_max_percent',//第四目标卖出比率
      type: "number",
      step: [0, 100, 1],
      value: 50
    },
  ],
  watch: [
    {
      name: 'max_watch_size',//最多监控交易对数量
      type: "number",
      step: [0, 30, 5],
      value: 10,
    },
    {
      name: 'watch_symbols',//初始监控交易对列表
      type: "textarea",
      value: '',
      placeholder: true,
    },
    {
      name: 'watchInit',
      type: "group"
    },
    {
      name: 'watch_include_bought',//初始监控包括已购买项
      type: "bool",
      value: true,
    },
    {
      name: 'watch_with_black_list',//初始监控排队黑名单项
      type: "bool",
      value: true,
    },
    {
      name: 'black_list',//黑名单
      type: "textarea",
      value: '',
      placeholder: true,
    }
  ],
  paper: [//模拟交易相关
    {
      name: 'currency_capital',//初始资金量
      type: "number",
      step: [0, 10000, 1000],
      value: 1000,
    },
    {
      name: 'asset_capital',//初始交易对量
      type: "number",
      step: [0, 10000, 1000],
      value: 0,
    }
  ]
}
```

## 安全配置

安全配置文件位于 /config 目录内，文件名为config-secret.js，内容如下

```javascript
const keys = {
    //pre defined api key for client app connect
    apiKey: 'YOUR API KEY FOR CLINET APP',//客户端身份认证api key
    //exchange api key
    binance: {
        key: 'YOUR BINANCE API KEY',//您在币安的API KEY
        secret: 'YOUR BINANCE API SECRET',//您在币安的API SECRET
    },
    binanceusdm: {
        key: 'YOUR BINANCEUSDM API KEY',
        secret: 'YOUR BINANCEUSDM API SECRET',
        takerFee: 'YOUR BINANCEUSDM CUSTOM TAKER FEE',//custom taker fee for you
        makerFee: 'YOUR BINANCEUSDM CUSTOM MAKER FEE'//custom maker fee for you
    }
}
```

1. 在初次使用时，请将config-secret-sample.js改名为config-secret.js

2. 安全配置文件包含三方面的内容，需要您进行填写，其中第三方交易所API为必填项

   - 数据库配置 db

   - 第三方交易所API

   - 客户端连接 apk key //用户在客户端添加此机器人时需要提供此api key才能实时管理，否则即使添加也为只读状态

3. 如果您需要使用新的安全配置覆盖初始值，您可以在提交`--secret`命令参数

```bash
yarn trade binance --conf ./data/config/binance/spot.json --secret ./data/config/binance/secret.json
```

## 期货配置

期货配置是一个单独的文件config-future.js,基于期货杠杆的存在，该配置文件对止赢止损及一些基础配置选项提供了额外的值。如果您建立一个基于期货的交易机器人，建议您使用此配置文件覆盖config-base。

## 价格线程配置

价格线程配置是一个单独的文件config-server.js,如果您的计算机算力有限或希望通过超短的时间不断加载价格数据或希望在同一机器运行同一交易所的多个机器人（一般交易所会有fetchTickers时间限制），建议您使用单独的价格线程来获得实时价格。

价格线程配置如下

```javascript
/**
 * if you want use a thread to watch tickers alone
 */
module.exports = {
    poll_scan_time: 3000,//轮询时间间隔
    poll_watch_wait: 1000,//使用websocket获得数据时，每次延迟时间
    db: {
        mongo: {
            db: "xcoin"//保存交易对的数据库
        }
    },
    server: {
        port: 17810,//价格线程的端口
        save_pairs: "binanceusdm.BTC-USDT,binanceusdm.DOGE-USDT"//实时保存的交易对，使用all全部保存，主要用于回测
    }
}
```
