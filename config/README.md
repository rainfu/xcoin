# Basic configuration

## config-base.js

Basic bot trading configuration

## config-secret.js

Secret trading configuration, such as database username and password, exchange API key and secret, and client API key

## config-secret-sample.js

Copy this file and rename it to config-secret.js and fill in the content to start

## conf-future.js

Futures Based Basic Trading Configuration

## conf-server.js

Parameter settings for updating real-time prices

## binance.config.js

Based on PM2. Two threads will be started, one for updating prices and one for trading

## binanceusdm.config.js

Based on PM2.  Three threads will be started, one for updating prices and two for transactions, updating data sources with the same price but using different configuration files
