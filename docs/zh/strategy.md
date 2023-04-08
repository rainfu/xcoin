# 策略

XCoin使用一种全新的方式让您可以轻松管理理解策略，管理策略并创建您自己的策略文件 并通过运行主程序方便地测试它们。 XCoin使用 [technicalindicators](https://github.com/anandanand84/technicalindicators) 库作为策略基础运算库，包含K线识别库与其它一些常见的策略逻辑。

目前XCoin提供了包含K线识别库在内的5个基础策略库，理论上，您可以无需编码，通过添加JSON文件即可运行所有数十种基础策略与无限种组合策略。

如果您希望快速建立策略文件，您可以

- 理解策略类 strategy.js的运行逻辑

- 熟悉系统策略json文件

- 创建您自己的系统策略或组合策略文件

- 可视化地建立组合策略文件

## 策略类的运行逻辑

XCoin主程序在运行过程中与策略文件的交互关系，通过交互获得交易信号进行交易

- 初始化时加载策略文件初始化策略

- 通过预加载K线周期获得策略需要的预加载的数据

- 在主程序每次轮询时与策略交互
  
  - 传递实时K线数据获得策略输出值（calculate)
  
  - 通过策略输出值计算是否触发交易信号（onPeriod）
  
  - 数据在终端容器或客户端显示形式（onReport)

K线数据根据策略数据实时更新，所以交易信号为实时K线信号提供，在K线数据中包含买卖信号及数值。每条K线的数据如下所示

```javascript
{
    "period_id": "2h233427",
    "size": "2h",
    "time": 1680674400000,
    "open": 315.32,
    "high": 315.87,
    "low": 314.52,
    "close": 314.76,
    "volume": 0,
    "close_time": 1680681599999,
    "latest_trade_time": 1680680369086,
    "strategy": {
        "RSI_buyCrossCount": 0,
        "RSI_sellCrossCount": 0,
        "RSI": 70.5,//RSI值
        "RSI_buy": false,//当前RSI是否有买信号
        "RSI_sell": false,//当前RSI是否有卖信号
        "PSAR": 306.28807188895047,//PSAR值
        "trend": 13,//PSAR趋势持续周期
        "PSAR_buy": false,//当前PSAR是否有买信号
        "PSAR_sell": false//当前PSAR是否有卖信号
    }
}
```

我们以一个基本的BollingerBands.json为例来说明策略文件的组成，每个策略文件包括多个子策略，多个子策略的买点或卖点出现时，通过connecttype(连接方式)决定买卖点组合方式。下图注释了每个策略文件的参数的意见。editable为false时代表为基础策略，你可以组合多个基础策略来获得组合策略

```javascript
{
    "id": "BollingerBands", 
    "name": "BollingerBands", //策略名称
    "des": "BollingerBands",
    "editable": false,//是否可编辑
    "group": "custom",
    "order": 20,
    "strategies": [//子策略
        {
            "name": "BollingerBands",//子策略名称
            "group": "volatility",
            "input": [//策略输入
                {
                    "name": "period",//布林带周期数
                    "type": "number",//数据类型
                    "step": [//取值范围
                        2,
                        100,
                        1
                    ],
                    "value": 14
                },
                {
                    "name": "stdDev",//布林带偏移
                    "type": "number",
                    "step": [
                        -1,
                        30,
                        1
                    ],
                    "value": 2
                },
                {
                    "name": "valType",//输入数据类型
                    "type": "array",//数据类型
                    "list": [
                        "open",//开盘价
                        "high",//最高价
                        "low",//最低价
                        "close",//收盘价
                        "volume"//成交量
                    ],
                    "value": [
                        "close"// 默认为收盘价
                    ]
                }
            ],
            "output": [
                {
                    "name": "upper",//上轨
                    "report": true,//在report中实时显示
                    "show": true,//在客户端显示
                    "pos": "main",//显示在主图
                    "type": "line"//显示类型为线图
                },
                {
                    "name": "middle",//中轨
                    "report": true,
                    "show": true,
                    "pos": "main",
                    "type": "line"
                },
                {
                    "name": "lower",//轨
                    "report": true,
                    "show": true,
                    "pos": "main",
                    "type": "line"
                },
                {
                    "name": "pw",//带宽
                    "report": true,
                    "mark": true,
                    "show": true,
                    "pos": "sub",//显示在子图
                    "type": "line"
                },
                {
                    "name": "signals",//交易信号
                    "report": false,//不实时显示
                    "show": true,
                    "pos": "sub",//显示在子图
                    "type": "marker"//显示为标记，
                }
            ],
            "buyPoint": {//收盘价上穿下轨
                "connect": "base",//多个买点时连接方式,base为基础，
                "source": "close",//条件左侧，可从输入，输出，k线中选择条件
                "op": "crossUp",//条件，包括大于，小于，等于，上穿，下穿
                "target": "lower"//条件右侧，可从输入，输出，k线中选择条件
            },
            "sellPoint": {//收盘价下穿上轨
                "connect": "base",
                "source": "close",
                "op": "crossDown",
                "target": "upper"
            }
        }
    ]
}
```

## 系统提供的策略类型

目前系统提供了如下几种策略，其中CUSTOM策略是一种自由组合策略，其它策略均是与RSI进行组合的策略。他们位于 /extensions/strategies/list 目录内，[technicalindicators](https://github.com/anandanand84/technicalindicators) 库提供了绝大部分当前可用的交易策略，您可以随时将新的策略添加至系统或用户策略。

- PSAR

- BOLLINGERBANDS

- MACD

- CANDLESTICK

- RSI

- CUSTOM

## 创建您自己的策略

如果您希望在现有策略上进行组合，请在 /data/strategies内创建建一个新的json文件，将strategies内添加您希望使用的系统策略即可，您可以使用一种，两种或任意种策略，注意处理好策略之间的合作关系(connect type)即可。

如果您希望扩展现有的系统策略，请了解 [technicalindicators](https://github.com/anandanand84/technicalindicators) 库，了解strategy.js 策略文件的运行逻辑，在 /extensions/strategies/list 中添加新的json文件并设置好参数即可，您可以随时通过运行trade.js来检测策略是否正确讲得并正确显示
