# 基本配置

## config-base.js

基本交易参数配置

## config-secret.js

保密交易参数配置，比如 数据库用户名密码，交易所api key与secret，客户端api key

## config-secret-sample.js

复制此文件并重命名为config-secret.js并填写内容即可开始

## conf-future.js

基于期货的基础交易配置

## conf-server.js

单独更新实时价格的参数设置

## binance.config.js

基于pm2启动的币安现货配置。将启动两个线程，一个用于更新价格，一个用于交易

## binanceusdm.config.js

基于pm2启动的币安期货配置。将启动三个线程，一个用于更新价格，两个用于交易，采用同一价格更新数据源但使用不同的配置文件
