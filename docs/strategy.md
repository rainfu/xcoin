# Strategy

XCoin uses a new way to allow you to easily manage and understand strategy, manage strategies and create your own strategy files and test them conveniently by running the main program. XCoin uses the [technicalindicators](https://github.com/anandanand84/technicalindicators) library as the basic calculation library of the strategy, including the K-line identification library and some other common strategy logic.

At present, XCoin provides 5 basic strategy libraries including K-line recognition library. In theory, you can run all dozens of basic strategies and unlimited combination strategies by adding JSON files without coding.

If you wish to quickly build a strategy file, you can

- Understand the operating logic of the strategy class strategy.js
- Familiar with the system strategy json file
- Create your own system strategy or combined strategy files
- Visually create combined strategy files

## The operation logic of the strategy class

The interactive relationship between the XCoin main program and the strategy file during the running process, through the interaction to obtain trading signals for trading

- load strategy file initialization strategy at initialization time
- Obtain the preloaded data required by the strategy by preloading the K-line cycle
- Interact with the strategy every poll of the main program
  - Transmit real-time K-line data to obtain strategy output value (calculate)
  - Calculate whether to trigger a trading signal (onPeriod) through the strategy output value
  - The data is displayed in the terminal container or client (onReport)

The K-line data is updated in real time according to the strategy data, so the trading signal is provided by the real-time K-line signal, and the K-line data includes buying and selling signals and values. The data of each K line is as follows

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
         "RSI": 70.5, //RSI value
         "RSI_buy": false, //whether the current RSI has a buy signal
         "RSI_sell": false, //whether the current RSI has a sell signal
         "PSAR": 306.28807188895047, //PSAR value
         "trend": 13,//PSAR trend continuation period
         "PSAR_buy": false, //whether there is a buy signal for current PSAR
         "PSAR_sell": false//whether the current PSAR has a sell signal
     }
}
```

Let's take a basic BollingerBands.json as an example to illustrate the composition of the strategy file. Each strategy file includes multiple sub-strategies. When the buying or selling points of multiple sub-strategies appear, the combination of buying and selling points is determined by the connecttype (connection method). The diagram below annotates the comments for each strategy file parameter. When editable is false, it represents the basic strategy, and you can combine multiple basic strategies to obtain a combined strategy

```javascript
{
     "id": "BollingerBands",
     "name": "BollingerBands", //Strategy name
     "des": "Bollinger Bands",
     "editable": false, //Whether it can be edited
     "group": "custom",
     "order": 20,
     "strategies": [//sub-strategies
         {
             "name": "BollingerBands",//sub-strategy name
             "group": "volatility",
             "input": [//strategy input
                 {
                     "name": "period", // Bollinger band period number
                     "type": "number",//data type
                     "step": [//value range
                         2,
                         100,
                         1
                     ],
                     "value": 14
                 },
                 {
                     "name": "stdDev",//Bollinger band offset
                     "type": "number",
                     "step": [
                         -1,
                         30,
                         1
                     ],
                     "value": 2
                 },
                 {
                     "name": "valType", // input data type
                     "type": "array", // data type
                     "list": [
                         "open",//opening price
                         "high",//highest price
                         "low",//lowest price
                         "close", // closing price
                         "volume"//volume
                     ],
                     "value": [
                         "close"// defaults to the closing price
                     ]
                 }
             ],
             "output": [
                 {
                     "name": "upper",//upper track
                     "report": true,//Real-time display in the report
                     "show": true,//display on the client
                     "pos": "main",//displayed in the main image
                     "type": "line"//The display type is a line graph
                 },
                 {
                     "name": "middle",//middle track
                     "report": true,
                     "show": true,
                     "pos": "main",
                     "type": "line"
                 },
                 {
                     "name": "lower",//track
                     "report": true,
                     "show": true,
                     "pos": "main",
                     "type": "line"
                 },
                 {
                     "name": "pw", //bandwidth
                     "report": true,
                     "mark": true,
                     "show": true,
                     "pos": "sub",//displayed in the submap
                     "type": "line"
                 },
                 {
                     "name": "signals",//trading signals
                     "report": false,//Do not display in real time
                     "show": true,
                     "pos": "sub",//displayed in the submap
                     "type": "marker"//displayed as a marker,
                 }
             ],
             "buyPoint": {//The closing price crosses the upper and lower rails
                 "connect": "base",//Connection method when multiple buying points, base is the basis,
                 "source": "close",//on the left side of the condition, you can choose the condition from input, output, k-line
                 "op": "crossUp", //Conditions, including greater than, less than, equal to, upper wear, lower wear
                 "target": "lower"//On the right side of the condition, you can choose the condition from input, output, and k-line
             },
             "sellPoint": {//Closing price below the upper track
                 "connect": "base",
                 "source": "close",
                 "op": "crossDown",
                 "target": "upper"
             }
         }
     ]
}
```

## strategy types provided by the system

At present, the system provides the following strategies, among which the CUSTOM strategy is a free combination strategy, and the other strategies are all strategies combined with RSI. They are located in the /extensions/strategies/list directory, the [technicalindicators](https://github.com/anandanand84/technicalindicators) library provides most of the currently available trading strategies, and you can add new strategies to the system or user strategies at any time.

- PSAR
- BOLLINGER BANDS
- MACD
- CANDLESTICK
- RSI
-CUSTOM

## Create your own strategy

If you want to combine the existing strategies, please create a new json file in /data/strategies, and add the system strategy you want to use in the strategies, you can use one, two or any Strategies, pay attention to handle the cooperative relationship (connect type) between strategies.

If you want to extend the existing system strategy, please understand the [technicalindicators](https://github.com/anandanand84/technicalindicators) library, understand the operation logic of the strategy.js strategy file, add a new json file in /extensions/strategies/list and set the parameters. You can check if the strategy is spoken and displayed correctly at any time by running trade.js
