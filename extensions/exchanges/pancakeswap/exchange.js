const path = require("path"),
  // eslint-disable-next-line no-unused-vars
  colors = require("colors"),
  exchagneId = "pancakeswap",
  moment = require("moment"),
  tb = require("timebucket"),
  HttpsProxyAgent = require("https-proxy-agent"),
  pancakeswap = require("./pancakeswap"),
  options = {};
module.exports = function container(conf, so, inOptions) {
  var authed_client;
  var logger = conf.logger;
  function authedClient() {
    if (!authed_client) {
      if (
        !conf.secret.keys[exchagneId] ||
        !conf.secret.keys[exchagneId].api.bscscan
      ) {
        throw new Error(
          "please configure your " +
            exchagneId +
            " credentials in " +
            path.resolve(__dirname, "conf.js")
        );
      }
      /* if (conf.in_test) {
        conf.secret.keys[exchagneId].chainId = 97
      } */
      authed_client = new pancakeswap({
        apiKey: conf.secret.keys[exchagneId].api.bscscan,
        secret: "",
        options: conf.secret.keys[exchagneId],
        enableRateLimit: true,
      });
      setProxy(authed_client);
    }
    return authed_client;
  }
  function setProxy(client) {
    if (so.proxy) {
      const agent = new HttpsProxyAgent(so.proxy);
      client.agent = agent;
    }
  }
  /**
   * Convert BNB-BTC to BNB/BTC
   *
   * @param product_id BNB-BTC
   * @returns {string}
   */
  function retry(method, args, err) {
    if (
      method !== "getTrades" &&
      method !== "getKLines" &&
      method !== "getTickers"
    ) {
      console.error(
        (
          "\nretry " +
          exchagneId +
          " API is down! unable to call " +
          method +
          ", retrying in 20s"
        ).red
      );
      if (err) console.error(err);
      console.error(args.slice(0, -1));
    }
    setTimeout(function () {
      exchange[method].apply(exchange, args);
    }, 20000);
  }
  var orders = {};
  var products;
  var exchange = {
    name: exchagneId,
    historyScan: "forward",
    historyScanUsesTime: true,
    defi: true,
    makerFee: 0.1,
    takerFee: 0.1,
    periodOfHour(period) {
      let periodToHour = {
        "1h": "1",
        "2h": "2",
        "4h": "4",
        "8h": "8",
        "12h": "12",
        "24h": "24",
        "1d": "24",
        "3d": "72",
        "1w": "168",
      };
      return periodToHour[period];
    },
    initFees() {
      if (
        conf.secret.keys[exchagneId] &&
        conf.secret.keys[exchagneId].takerFee
      ) {
        this.takerFee = conf.secret.keys[exchagneId].takerFee;
      }
      if (
        conf.secret.keys[exchagneId] &&
        conf.secret.keys[exchagneId].makerFee
      ) {
        this.makerFee = conf.secret.keys[exchagneId].makerFee;
      }
      if (so.takerFee) {
        this.takerFee = so.takerFee;
      }
      if (so.makerFee) {
        this.makerFee = so.makerFee;
      }
    },
    refreshProducts(cb, force = true) {
      //if (!force) {
      return cb(this.getProducts());
      // }
      var client = authedClient();
      console.log("refreshProducts start..", JSON.stringify(conf.defi));
      client.fetchMarkets(conf.defi).then(({ newTokenList, blacklist }) => {
        console.log(
          "refreshProducts ok..",
          newTokenList.length,
          blacklist.length
        );
        const resProducts = newTokenList.map((market) => {
          // NOTE: price_filter also contains minPrice and maxPrice
          return {
            id: market.id,
            asset: market.base,
            symbol: market.symbol,
            csymbol: market.csymbol,
            currency: market.quote,
            active: market.active,
            decimals: market.decimals.toString(),
            price: market.price,
            created: market.created,
            volumeUSD: market.volumeUSD,
            txCount: market.txCount,
            label: market.name
              ? market.name.replace("unknown", market.symbol)
              : market.name,
            verified: market.verified,
            contract_name: market.contract_name,
            total_supply: market.total_supply || "",
            holders: market.holders || "",
            site: market.site || "",
            social: market.social || "",
            exchagne_id: exchagneId,
            product_id: market.symbol + "-" + market.csymbol,
            normalized: exchagneId + "." + market.symbol + "-" + market.csymbol,
          };
        });
        //  console.log('resProducts', resProducts.length)
        const exitProducts = this.getProducts();
        //清理不需要的地址
        const newProducts = [];
        console.log("exitProducts", exitProducts.length);
        resProducts.map((product) => {
          //合并老的地址
          const find = exitProducts.find((p) => p.id === product.id);
          if (find) {
            Object.assign(find, product);
          } else {
            newProducts.push(product);
            exitProducts.push(product);
          }
        });
        console.log(
          "\nrefreshProducts ok all %s,new %s",
          exitProducts.length,
          newProducts.length
        );
        var target = require("path").resolve(
          __dirname,
          "../../../data/exchanges/" + exchagneId + "_products.json"
        );
        require("fs").writeFileSync(
          target,
          JSON.stringify(exitProducts, null, 2)
        );
        if (newProducts.length) {
          var newProductTarget = require("path").resolve(
            __dirname,
            "../../../data/exchanges/" + exchagneId + "_new.json"
          );
          require("fs").writeFileSync(
            newProductTarget,
            JSON.stringify(newProducts, null, 2),
            { flag: "a" }
          );
        }
        if (blacklist.length) {
          var blacklistTarget = require("path").resolve(
            __dirname,
            "../../../data/exchanges/" + exchagneId + "_blacklist.json"
          );
          require("fs").writeFileSync(
            blacklistTarget,
            JSON.stringify(blacklist, null, 2)
          );
        }
        // console.log('wrote', target)
        cb(exitProducts, newProducts);
      });
    },
    getProducts: function () {
      try {
        if (products) return products;
        return require(`../../../data/exchanges/${exchagneId}_products.json`);
      } catch (e) {
        return [];
      }
    },
    getPoolOptions(opts) {
      var product;
      if (opts.product_id) {
        product = products.find((p) => p.product_id === opts.product_id);
      } else if (opts.asset) {
        product = products.find((p) => p.asset === opts.asset);
      }
      if (product) {
        opts.id = product.id;
        opts.decimals = product.decimals;
        opts.asset = product.asset;
        opts.currency = product.currency;
        opts.symbol = product.symbol;
        opts.csymbol = product.csymbol;
      }
      return opts;
    },
    getTrades: function (opts, cb) {
      var func_args = [].slice.call(arguments);
      var authlient = authedClient();
      var args = {};
      if (!opts.from) {
        opts.from = 0;
      }
      //  console.log('getTrades', opts, args)
      this.getPoolOptions(opts);
      // console.log('getTrades', opts, args)
      authlient
        .fetchTrades(opts, args)
        .then((result) => {
          // console.log('fetchTrades result', result[0])
          var trades = result.map((trade) => ({
            trade_id: trade.id,
            time: trade.timestamp,
            size: parseFloat(trade.amount),
            price: trade.price,
            side: trade.side,
          }));
          // console.log('fetchTrades ok', trades[0])
          cb(null, trades);
        })
        .catch(function (error) {
          logger.error("getTrades An error occurred:" + error.toString());
          return retry("getTrades", func_args);
        });
    },
    getKLines: function (opts, cb) {
      var func_args = [].slice.call(arguments);
      var authlient = authedClient();
      var args = {};
      if (!opts.from) {
        opts.from = 0;
      }
      let comineNumb = this.periodOfHour(opts.period);
      opts.limit = comineNumb * opts.limit;
      /* console.log(
        "opts",
        opts.period,
        opts.limit,
        this.periodOfHour(opts.period)
      ); */
      opts.from = tb().resize("1h").subtract(opts.limit).toMilliseconds();
      this.getPoolOptions(opts);
      //   var hour_period = authlient.periodOfHour(opts.period)
      authlient
        .fetchOHLCV(opts, args)
        .then((result) => {
          /* console.log(
            "fetchOHLCV result",
            result[0],
            result[1],
            result[2],
            result[result.length - 2],
            result[result.length - 1]
          ); */
          var klines = [];
          result.forEach((kline) => {
            let d = tb(kline[0]).resize(opts.period);
            let de = tb(kline[0]).resize(opts.period).add(1);
            const find = klines.find((kl) => kl.period_id === d.toString());
            if (!find) {
              klines.push({
                period_id: d.toString(),
                time: d.toMilliseconds(),
                size: opts.period,
                close_time: de.toMilliseconds() - 1,
                closeStr: moment(de.toMilliseconds() - 1).format(
                  "YYYYMMDDHHMM"
                ),
                open: kline[1],
                high: kline[2],
                low: kline[3],
                close: kline[4],
                volume: kline[5],
              });
            } else {
              Object.assign(find, {
                high: Math.max(find.high, kline[2]),
                low: Math.min(find.low, kline[3]),
                close: kline[4],
                volume: find.volume + kline[5],
              });
            }
          });
          /* console.log(
            "fetchOHLCV ok",
            klines.length,
            klines[klines.length - 2],
            klines[klines.length - 1]
          ); */
          cb(null, klines);
        })
        .catch(function (error) {
          logger.error("getKLines An error occurred:" + error.toString());
          if (
            error.name &&
            error.name.match(
              new RegExp(/BadSymbol|InvalidOrder|InsufficientFunds|BadRequest/)
            )
          ) {
            return cb(error.name, {
              status: "rejected",
              reject_reason: error.name,
            });
          }
          return retry("getKLines", func_args);
        });
    },
    cancelOrder: function (opts, cb) {
      //去中心化平台无法取消交易
      return cb(null);
    },
    buy: function (opts, cb) {
      var func_args = [].slice.call(arguments);
      var client = authedClient();
      if (typeof opts.post_only === "undefined") {
        opts.post_only = true;
      }
      opts.type = "limit";
      var args = {};
      if (opts.order_type === "taker") {
        delete opts.post_only;
        opts.type = "market";
      }
      //部分exchange不支持市价单
      if (!client.has.createMarketOrder) {
        opts.type = "limit";
      }
      opts.side = "buy";
      delete opts.order_type;
      var order = {};
      this.getPoolOptions(opts);
      opts.extractIn = opts.price ? opts.price * opts.size : opts.size;
      opts.slippage = conf.max_slippage_pct;
      //  console.log('\nbuy opts', opts)
      client
        .createOrder(
          opts,
          opts.type,
          opts.side,
          opts.extractIn,
          opts.price,
          opts.slippage,
          args
        )
        .then((result) => {
          console.log("buy result...", result);
          if (result && result.message === "Insufficient funds") {
            order = {
              status: "rejected",
              reject_reason: "balance",
            };
            return cb(null, order);
          }
          order = {
            id: result ? result.id : null,
            status: "open",
            price: result.price || opts.price,
            size: opts.size,
            post_only: !!opts.post_only,
            created_at: new Date().getTime(),
            filled_size: "0",
            ordertype: opts.order_type,
          };
          orders["~" + result.id] = order;
          // console.log('buy ok ', order)
          cb(null, order);
        })
        .catch(function (error) {
          logger.error("buy An error occurred:" + error.toString());

          // decide if this error is allowed for a retry:
          // {"code":-1013,"msg":"Filter failure: MIN_NOTIONAL"}
          // {"code":-2010,"msg":"Account has insufficient balance for requested action"}
          if (
            error.name &&
            error.name.match(
              new RegExp(/GetBuyTradeError|INSUFFICIENT_FUNDS|BadRequest/)
            )
          ) {
            return cb(null, {
              status: "rejected",
              reject_reason: error.name,
            });
          }
          if (
            error.message &&
            error.message.match(
              new RegExp(/INSUFFICIENT_FUNDS|GetBuyTradeError|-2010/)
            )
          ) {
            return cb(null, {
              status: "rejected",
              reject_reason: "trade",
            });
          }
          return retry("buy", func_args);
        });
    },
    sell: function (opts, cb) {
      var func_args = [].slice.call(arguments);
      var client = authedClient();
      if (typeof opts.post_only === "undefined") {
        opts.post_only = true;
      }
      opts.type = "limit";
      var args = {};
      if (opts.order_type === "taker") {
        delete opts.post_only;
        opts.type = "market";
      }
      //部分exchange不支持市价单
      if (!client.has.createMarketOrder) {
        opts.type = "limit";
      }
      opts.side = "sell";
      delete opts.order_type;
      var order = {};
      this.getPoolOptions(opts);
      opts.extractIn = opts.price ? opts.price * opts.size : opts.size;
      opts.slippage = conf.max_slippage_pct;
      //  console.log('sell opts', opts)
      client
        .createOrder(
          opts,
          opts.type,
          opts.side,
          opts.size,
          opts.price,
          opts.slippage,
          args
        )
        .then((result) => {
          console.log("sell result...", result);
          if (result && result.message === "Insufficient funds") {
            order = {
              status: "rejected",
              reject_reason: "balance",
            };
            return cb(null, order);
          }
          order = {
            id: result ? result.id : null,
            status: "open",
            price: result.price || opts.price,
            size: opts.size,
            post_only: !!opts.post_only,
            created_at: new Date().getTime(),
            filled_size: "0",
            ordertype: opts.order_type,
          };
          orders["~" + result.id] = order;
          cb(null, order);
        })
        .catch(function (error) {
          logger.error("sell An error occurred:" + error.toString());
          // decide if this error is allowed for a retry:
          // {"code":-1013,"msg":"Filter failure: MIN_NOTIONAL"}
          // {"code":-2010,"msg":"Account has insufficient balance for requested action"}
          if (
            error.name &&
            error.name.match(
              new RegExp(/InvalidOrder|InsufficientFunds|BadRequest/)
            )
          ) {
            return cb(null, {
              status: "rejected",
              reject_reason: error.name,
            });
          }
          if (error.message.match(new RegExp(/-1013|MIN_NOTIONAL|-2010/))) {
            return cb(null, {
              status: "rejected",
              reject_reason: "balance",
            });
          }
          return retry("sell", func_args);
        });
    },
    getBalance: function (opts, cb) {
      var func_args = [].slice.call(arguments);
      var client = authedClient();
      this.getPoolOptions(opts);
      let tokens = [opts.asset];
      if (opts.symbols) {
        tokens = opts.symbols.map((s) => {
          return s.asset;
        });
      }
      // console.log("getBalance", tokens);
      client
        .fetchBalance(tokens)
        .then((result) => {
          //   console.log("getBalance result", result);
          /* let result = {
            "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c": {
              free: 0.4487151571559786,
              used: 0,
              total: 0.4487151571559786,
            },
            "0xed376501f61046a3f43dac6d5ab51a700dda46fc": {
              free: 0,
              used: 0,
              total: 0,
            },
          }; */
          var balance = { asset: 0, currency: 0 };
          Object.keys(result).forEach(function (key) {
            if (key.toLowerCase() === opts.currency.toLowerCase()) {
              balance.currency = result[key].free + result[key].used;
              balance.currency_hold = result[key].used;
            } else {
              const num = result[key].free + result[key].used;
              // if (num > 0) {
              if (!balance.assets) balance.assets = {};
              //  if (key.toLowerCase() !== opts.asset.toLowerCase()) {
              balance.assets[key] = {
                asset: num,
                asset_hold: result[key].used,
              };
              // }
              // }
            }
            if (key.toLowerCase() === opts.asset.toLowerCase()) {
              balance.asset = result[key].free + result[key].used;
              balance.asset_hold = result[key].used;
            }
          });
          //   console.log("getBalance result", balance);
          cb(null, balance);
        })
        .catch(function (error) {
          logger.error("getBalance An error occurred:" + error.toString());
          return retry("getBalance", func_args);
        });
    },
    getOrder: function (opts, cb) {
      var func_args = [].slice.call(arguments);
      var client = authedClient();
      var order = orders["~" + opts.order_id] || {};
      // https://api.bscscan.com/?txhash=0xe9975702518c79caf81d5da65dea689dcac701fcdd063f848d4f03c85392fd00&api_key=V433U58M7ZWPZ38PMPJS1HVS5AF7S5F9WZ&module=transaction&action=gettxreceiptstatus\
      // https://api.bscscan.com/api?module=transaction&action=gettxreceiptstatus&txhash=0xe9975702518c79caf81d5da65dea689dcac701fcdd063f848d4f03c85392fd00&apikey=YourApiKeyToken
      client.fetchOrder(opts.order_id).then(
        function (body) {
          console.log("getOrder", body);
          if (body.status === "rejected") {
            order.status = "rejected";
            order.reject_reason = "balance";
            order.done_at = new Date().getTime();
            order.filled_size = 0;
            return cb(null, order);
          } else if (body.status !== "open" && body.status !== "canceled") {
            order.status = "done";
            order.done_at = new Date().getTime();
            order.filled_size = 0;
            return cb(null, order);
          }
          cb(null, order);
        },
        function (err) {
          if (
            err.name &&
            err.name.match(new RegExp(/InvalidOrder|BadRequest/))
          ) {
            return cb(err);
          }
          return retry("getOrder", func_args, err);
        }
      );
    },
    getQuote: function (opts, cb) {
      var func_args = [].slice.call(arguments);
      var client = authedClient();
      this.getPoolOptions(opts);
      // console.log("getQuote ...", opts);
      client
        .fetchTicker(opts)
        .then((result) => {
          //  console.log("getQuote result...", opts.product_id, result.bid);
          cb(null, {
            bid: result.bid,
            ask: result.ask,
            dayVolume: result.dayVolume,
          });
        })
        .catch(function (error) {
          logger.error("getQuote An error occurred:" + error.toString());
          return retry("getQuote", func_args);
        });
    },
    getTickers: function (opts, cb) {
      var func_args = [].slice.call(arguments);
      var client = authedClient();
      opts.symbols.forEach((f) => {
        this.getPoolOptions(f);
      });
      // console.log("getTickers ...", opts.symbols);
      client
        .fetchTickers(opts.symbols)
        .then((result) => {
          Object.keys(result).forEach((r) => {
            result[r].normalized =
              (options.defaultType === "future"
                ? exchagneId + "future."
                : exchagneId + ".") + r.replace("/", "-");
          });
          // console.log("getTickers result...", result);
          //  logger.info("getTickers ", result);
          cb(null, result);
        })
        .catch(function (error) {
          logger.error("getTickers An error occurred:" + error.toString());
          if (
            error.name &&
            error.name.match(
              new RegExp(/BadSymbol|InvalidOrder|InsufficientFunds|BadRequest/)
            )
          ) {
            return cb(error.name, {
              status: "rejected",
              reject_reason: error.name,
            });
          }
          return retry("getTickers", func_args);
        });
    },
    getPool: function (opts, cb) {
      var func_args = [].slice.call(arguments);
      var client = authedClient();
      this.getPoolOptions(opts);
      // console.log("getPool...", opts);
      client
        .fetchPool(opts)
        .then((result) => {
          // console.log('getPair result...', result)
          cb(null, result);
        })
        .catch(function (error) {
          console.error("An error occurred", error);
          return retry("getPair", func_args);
        });
    },
    getToken: function (opts, cb) {
      var func_args = [].slice.call(arguments);
      var client = authedClient();
      client
        .fetchToken(opts)
        .then((result) => {
          // console.log("getToken result...", result);
          cb(null, result);
        })
        .catch(function (error) {
          console.error("An error occurred", error);
          return retry("getToken", func_args);
        });
    },
    getCursor: function (trade) {
      // console.log('getCursor result...', trade, (trade.time || trade))
      return trade.time || trade;
    },
    updateSymbols: function (symbols) {
      products = this.getProducts();
      symbols.forEach((s) => {
        let product = products.find((p) => p.normalized === s.normalized);
        Object.assign(s, {
          asset: product.asset,
          currency: product.currency,
          symbol: product.symbol,
          csymbol: product.csymbol,
          id: product.id,
          decimals: product.decimals,
        });
      });
    },
  };
  exchange.updateSymbols(so.symbols);
  return exchange;
};
