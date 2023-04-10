# API

XCoin为客户端程序提供一套统一的API，通过API提供以下几个方面的信息

- status 提供当前交易机器人的运行状态
  - getInitData 获得机器人初始化数据
  - refreshData 获得机器人实时交易数据
- operation 提供与当前交易机器人进行的交互操作，如买卖或更新交易对等
  - bug 买入多或空
  - sell 卖出多或空
  - sellAll 清仓
  - addSymbol 将交易对添加至监控池
  - removeAllSymbol 清空监控池
  - removeSymbol 从监控池移除交易对
  - updateConfig 更新机器人设置
  - updateSymbolFuture 更新期货相关设置，如杠杆
- market 提供当前交易机器人对应的交易所的相关操作，如获得产品，报价等
- backtest 提供回测相关数据
- panacea 提供 [灵丹](https://github.com/markmind/panacea-api) 客户端相关内容
