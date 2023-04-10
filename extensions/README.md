# Extension

XCoin provides some basic extensions to enhance functionality, Developers can also develop more features through extension modules.

## Exchange extensions/extensions/exchanges

The exchange extension provides a data source for bot to trade. By default, the extension provided by CCxt is used. CCxt provides a large number of exchange data interfaces. If you need to develop a specific exchange interface, you can create your own exchange interface under the extensions.

The sim exchange is the main interface for simulating trading, including paper and sim modes. The former uses real exchange data for simulating trading, while the latter uses historical data for backtesting trading.

## API extensions/extensions/output

The relevant code for connecting XCoin to the client is provided. Currently, XCoin only supports APIs that match Panacea. Panacea is a real-time status management application for all platform (ANDROID, IOS, WINDOWS, MAC, LINUX) transaction bot, highly integrated with XCoin, capable of providing interfaces for all configurations, Strategies, and real-time transactions.

## Strategy extensions/extensions/ratings

Strategy extension provides the basic class strategy.js and built-in Strategies based on Strategy extension

## Strategy extensions/extensions/ratings/list

A built-in Strategy list that includes four separate Strategies with RSI and one composite Strategy, allowing you to easily obtain new Strategies by combining JSON files
