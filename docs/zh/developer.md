# 开发者

XCoin提供一些基础扩展来强化功能，开发者也可以通过扩展模块开发更多功能。

## API扩展 /extensions/output

提供了XCoin与客户端连接的相关代码，目前XCoin仅支持 灵丹 相匹配的API，灵丹是一款全平台（ANDROID,IOS,WINDOWS,MAC,LINUX）交易机器人实时状态管理应用，与XCoin高度集成，能够提供所有配置，策略，实时交易的接口。

## 交易所扩展 /extensions/exchanges

交易所扩展提供了供机器人进行交易的数据来源，默认情况下使用ccxt提供的扩展，ccxt了提供大量的交易所数据接口,如果您需要开发某一交易所特定的接口，您可以在extensions下创建自己的交易所接口。

defi交易所提供基于DEFI的交易所扩展，目前提供了Uniswap与Pancakeswap交易所的扩展,如果您需要开发某一交易所特定的接口，您可以在extensions下创建自己的交易所接口。

sim交易所是模拟交易的主接口，包括paper与sim两种模式，前者使用真实交易所数据进行模拟交易，后者使用历史数据回测交易。

您可以通过 [交易所](exchagne.md) 获得更多帮助

## 策略扩展 /extensions/strategies

策略扩展提供了基于策略扩展的基础类 strategy.js及内置策略

## 策略扩展 /extensions/strategies/list

内置的策略列表，包含四种包含RSI的单独策略及一个复合策略，您可能轻松通过组合json文件获得新策略

您可以通过 [交易策略](strategy.md) 获得更多帮助
