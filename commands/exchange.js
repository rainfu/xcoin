var minimist = require("minimist"),
  n = require("numbro"),
  // eslint-disable-next-line no-unused-vars
  path = require("path"),
  _ = require("lodash"),
  debug = require("../lib/debug"),
  helpers = require("../lib/helpers"),
  tb = require("timebucket"),
  colors = require("colors"),
  fs = require("fs");
module.exports = function (program, conf) {
  program
    .command("exchange [exchange]")
    .allowUnknownOption()
    .description("test exchange function")
    .option("--debug", "output with debug info")
    .option(
      "--watch_symbols <watch_symbols>",
      "watch_symbols",
      String,
      conf.watch_symbols
    )
    .option("--secret <path>", "custom exchange api secret", String, "")
    .option("--proxy <proxy>", "use proxy", String, conf.proxy)
    .option("--trade", "test get trades function")
    .option("--kline", "test get klines function")
    .option("--tickers", "test get tickers function")
    .option("--quote", "test get quote function")
    .option("--refresh", "refresh all products")
    .option("--order <orderid>", "get order with id", String, null)
    .option("--orders", "get orders", String, null)
    .option("--buy <buy_pct>", "buy with buy_pct", Number, null)
    .option("--sell <sell_pct>", "sell with sell_pct", Number, null)
    .option("--sellall", "sell all symbols")
    .option("--balance <position_side>", "LONG or SHORT", String, "")
    .action(function (exchangename, cmd) {
      let so = {};
      conf.proxy = cmd.proxy;
      conf.watch_symbols = cmd.watch_symbols;
      conf.buy_pct = cmd.buy;
      conf.sell_pct = cmd.sell;
      conf.position_side = cmd.balance.toUpperCase();
      conf.exchange = exchangename;
      Object.keys(conf).forEach(function (k) {
        if (
          k !== "eventBus" &&
          k !== "logger" &&
          k !== "secret" &&
          k !== "db"
        ) {
          so[k] = conf[k];
        }
      });
      delete so._;
      let symbolsIds = so.watch_symbols.split(",");
      so.symbols = symbolsIds.map((symbol) => {
        return helpers.objectifySelector(symbol);
      });
      //  console.log("so", so);
      var exchange;
      try {
        exchange = require(path.resolve(
          __dirname,
          `../extensions/exchanges/${exchangename}/exchange`
        ))(conf, so);
      } catch (e) {
        exchange = require(path.resolve(
          __dirname,
          "../extensions/exchanges/ccxt/exchange"
        ))(conf, so);
      }
      if (cmd.order) {
        var opts = {
          order_id: cmd.order,
          product_id: so.symbols[0].product_id,
        };
        console.log("start get order".cyan, opts);
        exchange.getOrder(opts, function (err, res) {
          if (err) console.log("error", err);
          console.log("getOrder ok..", res);
          process.exit(0);
        });
        return;
      }
      if (cmd.orders) {
        var opts = {
          product_id: so.symbols[0].product_id,
          limit: 5,
        };
        console.log("start get orders ".cyan, opts);
        exchange.getOrders(opts, function (err, res) {
          if (err) console.log("error", err);
          console.log("getOrders ok..", res);
          process.exit(0);
        });
        return;
      }
      if (cmd.refresh) {
        console.log(exchangename.green + " start refresh products".cyan);
        exchange.refreshProducts(() => {
          console.log(
            exchangename.green + " refreshProducts".cyan,
            exchange.getProducts().length
          );
          process.exit(0);
        });

        return;
      }

      if (cmd.trade) {
        //get trades
        var tradeOpts = {
          product_id: so.symbols[0].product_id,
          target_time: new Date().getTime(),
          start_time: new Date().getTime() - 86400000,
        };
        tradeOpts.from = exchange.getCursor(tradeOpts.start_time);
        exchange.getTrades(tradeOpts, function (err, trades) {
          if (err) console.log("error", err);
          console.log("trades..", trades.length);
          process.exit(0);
        });

        return;
      }

      //implement kline
      if (cmd.kline) {
        //get trades
        let opts = {
          product_id: so.symbols[0].product_id,
          period: so.period,
          start_time: new Date().getTime() - 86400000,
        };
        if (so.min_periods) {
          opts.start_time = tb()
            .resize(so.period)
            .subtract(so.min_periods)
            .toMilliseconds();
          opts.limit = so.min_periods;
        }
        opts.from = exchange.getCursor(opts.start_time);
        exchange.getKLines(opts, function (err, klines) {
          if (err) console.log("error", err);
          console.log(
            "getKLines..",
            opts,
            klines.length,
            "the first",
            klines[0],
            "the last",
            klines[klines.length - 1]
          );
          process.exit(0);
        });

        return;
      }
      if (cmd.tickers) {
        debug.msg(
          "start refresh all symbol tickers".green +
            " " +
            (" " + so.symbols.product_id).yellow
        );
        getTickers(JSON.parse(JSON.stringify(so.symbols)));
        return;
      }
      if (cmd.quote) {
        exchange.getQuote(so.symbols[0], function (err, realTickers) {
          if (err) {
            console.log("err", err);
            return;
          }
          console.log(exchange.name + " quote ok".green, realTickers);
          process.exit();
          return;
        });
        return;
      }
      //implement so.ticker
      function getTickers(symbols) {
        let opts = {
          symbols,
        };
        exchange.getTickers(opts, function (err, realTickers) {
          if (err) {
            console.log("err", err);
            return;
          }
          console.log(exchange.name + " tickers ok".green, realTickers);
          process.exit();
          return;
        });
        return;
      }

      //implement balane
      if (cmd.balance) {
        console.log(
          exchangename.cyan +
            " start get balance".green +
            " " +
            so.position_side
        );
        exchange.getBalance(
          {
            position_side: so.position_side || "LONG",
            currency: so.symbols[0].currency,
            asset: so.symbols[0].asset,
          },
          function (err, balance) {
            if (err) return;
            if (!balance.assets) return;
            delete balance.assets["NFT"];
            /*  console.log(
              "balance " + so.symbols[0].currency + " hold",
              balance.currency_hold
            ); */
            let symbols = Object.keys(balance.assets).map((key) => {
              return Object.assign(balance.assets[key], {
                product_id: key + "-" + so.symbols[0].currency,
                normalized:
                  exchangename + "." + key + "-" + so.symbols[0].currency,
              });
            });
            //console.log('symbols2', symbols)
            if (symbols.length) {
              exchange.getTickers({ symbols }, function (err, realTickers) {
                // console.log('realTickers', realTickers)
                // console.log('forward scan', realTickers.length, realTickers[realTickers.length - 1])
                let sum = 0;
                if (realTickers) {
                  Object.keys(realTickers).forEach((t) => {
                    let symbol = symbols.find(
                      (s) =>
                        s.normalized === realTickers[t].normalized ||
                        s.normalized + ":USDT" === realTickers[t].normalized
                    );
                    //  console.log('t', t, realTickers[t], symbol)
                    if (symbol) {
                      symbol.capital = n(symbol.asset)
                        .multiply(realTickers[t].close)
                        .value();
                      console.log("balance", symbol.normalized, symbol.capital);
                      sum += symbol.capital;
                    }
                  });
                }

                console.log(
                  exchangename.green +
                    "  get balance total".green +
                    ": " +
                    (balance.currency + sum)
                );
                process.exit();
              });
            } else {
            }

            // checkSymbols(cb, symbols, JSON.parse(JSON.stringify(symbols)))
          }
        );
        return;
      }
      //implement refrsh  products

      function getFullNum(num) {
        if (isNaN(num)) {
          return num;
        }
        var str = "" + num;
        if (!/e/i.test(str)) {
          return num;
        }
        return num.toFixed(18).replace(/0+$/, "");
      }
      function sellAllSymbols(symbols) {
        if (!symbols.length) {
          console.log("sell all symbols ok..");
          process.exit(0);
          return;
        }
        let p = symbols.pop();
        var opts = {
          size: getFullNum((p.size * so.sell_pct) / 100),
          order_type: "taker",
          position_side: p.position_side,
          product_id: p.product_id,
        };
        let ti3;
        exchange.sell(opts, function (err, sell_order) {
          if (err) {
            console.log("error", err);
            sellAllSymbols(symbols);
            if (ti3) clearInterval(ti3);
            return;
          }
          if (!sell_order || !sell_order.id) {
            console.log("sell error", sell_order);
            sellAllSymbols(symbols);
            if (ti3) clearInterval(ti3);
            return;
          }
          // console.log(p.exchange_id + ' sell ', p.product_id, sell_order, sell_order.id)
          opts.order_id = sell_order.id;
          opts.api_order2 = sell_order;
          ti3 = setInterval(() => {
            debug.msg("start check sell Order " + p.product_id);
            exchange.getOrder(opts, function (err, sell_order2) {
              if (err) {
                clearInterval(ti3);
                console.log("error", err);
                sellAllSymbols(symbols);
                return;
              }
              console.log(
                "sell order status: ".cyan +
                  sell_order2.status.green +
                  ", ".cyan +
                  n(sell_order2.filled_size)
                    .divide(sell_order2.size)
                    .format("0.0%").green +
                  " filled".cyan
              );
              if (sell_order2.status === "done") {
                clearInterval(ti3);
                debug.msg("sell order ok " + p.product_id);
                sellAllSymbols(symbols);
              }
            });
          }, conf.order_poll_time);
        });
      }
      exchange.refreshProducts((products) => {
        console.log(exchangename + " refreshProducts", products.length);
        //getBalance && getQuote
        console.log("start getBalance".green, so.symbols[0]);
        var opts = {
          position_side: so.position_side || "LONG",
          currency: so.symbols[0].currency,
          asset: so.symbols[0].asset,
        };
        exchange.getBalance(opts, function (err, balance) {
          if (err) {
            console.log("error", err);
            return;
          }
          console.log(exchangename + " getBalance", balance);
          //start only sell
          if (cmd.sellall) {
            debug.msg("start sellall ".green);
            let shouldSellSymbols = Object.keys(balance.assets).map(function (
              asset
            ) {
              let p = products.find((p) => p.asset === asset);
              if (p) {
                return Object.assign(p, {
                  position_side: so.position_side || "LONG",
                  size: balance.assets[asset].asset,
                });
              }
            });
            console.log("shouldSellSymbols", shouldSellSymbols);
            sellAllSymbols(shouldSellSymbols.reverse());
            return;
          }

          if (cmd.sell) {
            let symbol = so.symbols[0];
            debug.msg("start getQuote".green);
            exchange.getQuote(
              { product_id: symbol.product_id },
              (err, quotes) => {
                if (err) {
                  console.log("error", err);
                  return;
                }
                console.log(symbol.exchange_id + " getQuote", quotes);
                Object.assign(symbol, {
                  price: quotes.ask,
                  position_side: so.position_side || "LONG",
                  size: getFullNum(balance.asset * (so.sell_pct / 100)),
                });
                sellAllSymbols([symbol]);
                return;
              }
            );
          }
          if (cmd.buy) {
            debug.msg("start getQuote".green);
            exchange.getQuote(
              { product_id: so.symbols[0].product_id },
              (err, quotes) => {
                if (err) {
                  console.log("error", err);
                  return;
                }
                console.log(so.symbols[0].exchange_id + " getQuote", quotes);
                let opts = {
                  size: getFullNum(
                    balance.currency * (so.buy_pct / 100 / quotes.ask)
                  ),
                  price: quotes.ask,
                  product_id: so.symbols[0].product_id,
                  asset: so.symbols[0].asset,
                  order_type: so.order_type,
                  position_side: so.position_side || "LONG",
                  currency: so.symbols[0].currency,
                };
                //start buy
                debug.msg("start buy".green);
                // console.log('\nbuy opts', opts)
                // opts.price = opts.price / 2//TEST
                exchange.buy(opts, (err, order) => {
                  if (err) {
                    console.log("error", err);
                    if (ti2) clearInterval(ti2);
                    return;
                  }
                  console.log(so.symbols[0].exchange_id + " buy new", order.id);
                  opts.api_order = order;
                  opts.order_id = order.id;
                });
                const ti2 = setInterval(() => {
                  debug.msg("start checkOrder", opts.api_order);
                  if (!_.isEmpty(opts.api_order)) {
                    //  debug.msg('start checkOrder', opts.api_order.order_id)
                    exchange.getOrder(opts, function (err, buy_order2) {
                      if (err) {
                        console.log("error", err);
                        clearInterval(ti2);
                        return;
                      }
                      console.log(
                        "buy order status: ".cyan +
                          buy_order2.status.green +
                          ", ".cyan +
                          n(buy_order2.filled_size)
                            .divide(buy_order2.size)
                            .format("0.0%").green +
                          " filled".cyan
                      );
                      if (buy_order2.status === "done") {
                        debug.msg("buy order ok".green);
                        clearInterval(ti2);
                      }
                    });
                  } else {
                    console.log("buy placing order error...");
                  }
                }, conf.order_poll_time);
              }
            );
          }
        });
      }, false);
    });
};
