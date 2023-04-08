# Developer

XCoin provides some basic extensions to enhance functions, and developers can also develop more functions through extension modules.

## API extensions /extensions/output

The relevant codes for connecting XCoin to the client are provided. At present, XCoin only supports APIs matching [Panacea](https://github.com/markmind/panacea). Panacea is a full-platform (ANDROID, IOS, WINDOWS, MAC, LINUX) trading bot real-time status management application, which is highly compatible with XCoin Integration, can provide interfaces for all configurations, strategies, and real-time trading.

You can get more help at [API](api.md)

## Exchange Extensions /extensions/exchanges

The exchange extension provides the data source for the bot to trade. By default, the extension provided by ccxt is used. ccxt provides a large number of exchange data interfaces. If you need to develop an exchange-specific interface, you can create it under extensions Own exchange interface.

The sim exchange is the main interface for simulated trading, including paper and sim. The former uses real exchange data for simulated trading, and the latter uses historical data for backtesting transactions.

You can get more help at [exchangse](exchange.md)

## Strategy Extensions /extensions/strategies

Strategy extension provides the base class strategy.js and built-in strategy based on strategy extension

## Strategy extensions /extensions/strategies/list

The built-in strategy list includes four separate strategies including RSI and a compound strategy. You may easily obtain new strategies by combining json files

You can get more help with [Trading Strategies](strategy.md)
