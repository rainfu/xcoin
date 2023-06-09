let tb = require("timebucket"),
  moment = require("moment"),
  z = require("zero-fill"),
  n = require("numbro"),
  // eslint-disable-next-line no-unused-vars
  readline = require("readline"),
  path = require("path"),
  _ = require("lodash"),
  profit = require("./profit"),
  async = require("async"),
  lolex = require("lolex"),
  { formatAsset, formatPercent, formatCurrency } = require("./helpers"),
  { sendAction } = require("./strategy-helper"),
  debug = require("./debug"),
  fs = require("fs");

let clock;
let nice_errors = new RegExp(/(slippage protection|loss protection)/);

module.exports = function (s, conf, core) {
  let eventBus = conf.eventBus;
  let logger = conf.logger;
  eventBus.on("kline", onKLine);
  eventBus.on("klines", onKLines);
  let so = s.options;
  if (_.isUndefined(s.exchange)) {
    try {
      if (so.mode !== "live") {
        s.exchange = require(path.resolve(
          __dirname,
          "../extensions/exchanges/sim/exchange"
        ))(conf, so, s);
      } else {
        s.exchange = require(path.resolve(
          __dirname,
          `../extensions/exchanges/${so.exchange}/exchange`
        ))(conf, so);
      }
    } catch (e) {
      s.exchange = require(path.resolve(
        __dirname,
        "../extensions/exchanges/ccxt/exchange"
      ))(conf, so);
    }
  } else if (so.mode === "paper") {
    s.exchange = require(path.resolve(
      __dirname,
      "../extensions/exchanges/sim/exchange"
    ))(conf, so, s);
  }
  s.exchange.initFees();
  s.status.exchange = s.options.exchange;
  if (!s.exchange) {
    console.error("cannot trade " + so.exchange + ": exchange not implemented");
    process.exit(1);
  }

  if (!so.symbols.length) {
    console.error("Error: could not find any product");
    process.exit(1);
  }
  initSymbols(so.symbols);
  function initSymbols(symbols) {
    let products = s.exchange.getProducts();
    products.forEach(function (product) {
      symbols.forEach((symbol) => {
        if (
          product.asset === symbol.asset &&
          product.currency === symbol.currency
        ) {
          if (!s.symbols[symbol.product_id]) {
            s.symbols[symbol.product_id] = Object.assign({}, symbol, product);
            if (so.mode !== "live") {
              s.symbols[symbol.product_id].asset_capital = so.asset_capital;
              s.symbols[symbol.product_id].asset_amount = so.asset_capital;
            } else {
              s.symbols[symbol.product_id].asset_capital = 0;
              s.symbols[symbol.product_id].asset_amount = 0;
            }
            let index = symbols.indexOf(symbol);
            // console.log('initSymbols', symbol.product_id, index + 1)
            let _period =
              index >= 0 && so.symbolperiods && so.symbolperiods[index]
                ? so.symbolperiods[index]
                : so.period;
            s.symbols[symbol.product_id].index = index + 1;
            s.symbols[symbol.product_id]._period = _period;
            s.symbols[symbol.product_id].lookback = [];
            s.symbols[symbol.product_id].last_trade_id = 0;
            s.symbols[symbol.product_id].my_trades = [];
            s.symbols[symbol.product_id].loss_stop_buy_num = 0;
            s.symbols[symbol.product_id].usdtProfit = 0;
            s.symbols[symbol.product_id].dynamicProfit = 0;
            s.symbols[symbol.product_id].dynamicUsdtProfit = 0;
            s.symbols[symbol.product_id].profit = 0;
            s.symbols[symbol.product_id].last_trade_time = 0;
            s.symbols[symbol.product_id].win = 0;
            s.symbols[symbol.product_id].lost = 0;
            s.symbols[symbol.product_id].winLostRate = 0;
            s.symbols[symbol.product_id].asset_hold = 0;
            s.symbols[symbol.product_id].leverage = 20;
            s.symbols[symbol.product_id].isolated = so.isolated || false;
          }
        }
      });
    });
    let i = 1;
    s.options.symbols.forEach((symbol) => {
      if (s.symbols[symbol.product_id]) {
        s.symbols[symbol.product_id].index = i;
        i++;
      }
    });
  }
  function memDump() {
    if (!debug.on) return;
    let s_copy = JSON.parse(JSON.stringify(s));
    delete s_copy.options.db;
    delete s_copy.options.keys;
    delete s_copy.lookback;
    console.error(s_copy);
  }

  s.status.startTime = new Date().getTime();
  s.status.timeZoneOffset = new Date().getTimezoneOffset();
  s.status.status = "created";
  try {
    //init system strategies
    let strategies = [];
    let files = fs.readdirSync(
      path.resolve(__dirname, "../extensions/strategies/list")
    );
    for (let i = 0; i < files.length; i++) {
      if (files[i].lastIndexOf(".json") >= 0) {
        let file = require(path.resolve(
          __dirname,
          "../extensions/strategies/list/" + files[i]
        ));
        strategies.push(file);
      }
    }
    //init user strategies
    files = fs.readdirSync(path.resolve(__dirname, "../data/strategies"));
    for (let i = 0; i < files.length; i++) {
      if (files[i].lastIndexOf(".json") >= 0) {
        let file = require(path.resolve(
          __dirname,
          "../data/strategies/" + files[i]
        ));
        strategies.push(file);
      }
    }
    s.strategies = strategies.sort((a, b) => a.order - b.order);
  } catch (err) {
    console.log("error get strategies", err);
    process.exit(1);
  }
  if (so.strategy) {
    if (typeof so.strategy === "string") {
      // console.log(JSON.stringify(s.strategies, null, 2))
      let strategy = s.strategies.find((s) => s.name === so.strategy);
      if (!strategy) {
        console.error("Strategy not exits:" + so.strategy.red);
        process.exit(1);
      }
      so.strategy = strategy;
    }
    s.strategy = require(path.resolve(
      __dirname,
      `../extensions/strategies/strategy`
    ))(so);
    if (s.strategy.orderExecuted) {
      eventBus.on("orderExecuted", function (type) {
        s.strategy.orderExecuted(s, type, executeSignal);
      });
    }
  }
  var profitStop = profit(s, conf);

  function initPeriod(trade, symbol) {
    if (!symbol) symbol = so.symbols[0];
    let d = tb(trade.time).resize(s.symbols[symbol.product_id]._period);
    let de = tb(trade.time).resize(s.symbols[symbol.product_id]._period).add(1);
    s.symbols[symbol.product_id].period = {
      period_id: d.toString(),
      size: s.symbols[symbol.product_id]._period,
      time: d.toMilliseconds(),
      open: trade.price,
      high: trade.price,
      low: trade.price,
      close: trade.price,
      volume: trade.size,
      close_time: de.toMilliseconds() - 1,
      closeStr: moment(de.toMilliseconds() - 1).format("YYYYMMDDHHMM"),
      strategy: {},
    };
  }

  function nextBuyForQuote(s, quote, symbol) {
    if (!symbol) symbol = so.symbols[0];
    // console.log('s.next_buy_price', s.next_buy_price, s.symbols[symbol.product_id].increment)
    if (s.next_buy_price) {
      if (s.symbols[symbol.product_id].increment) {
        return n(s.next_buy_price).format(
          s.symbols[symbol.product_id].increment,
          Math.floor
        );
      } else {
        return n(s.next_buy_price).value();
      }
    } else {
      if (s.symbols[symbol.product_id].inSignal === "short") {
        if (s.symbols[symbol.product_id].increment) {
          return n(quote.bid)
            .add(n(quote.bid).multiply(s.options.markdown_buy_pct / 100))
            .format(s.symbols[symbol.product_id].increment, Math.floor);
        } else {
          return n(quote.bid)
            .add(n(quote.bid).multiply(s.options.markdown_buy_pct / 100))
            .value();
        }
      } else {
        if (s.symbols[symbol.product_id].increment) {
          return n(quote.bid)
            .subtract(n(quote.bid).multiply(s.options.markdown_buy_pct / 100))
            .format(s.symbols[symbol.product_id].increment, Math.floor);
        } else {
          return n(quote.bid)
            .subtract(n(quote.bid).multiply(s.options.markdown_buy_pct / 100))
            .value();
        }
      }
    }
  }

  function nextSellForQuote(s, quote, symbol) {
    if (!symbol) symbol = so.symbols[0];
    if (s.next_sell_price) {
      if (s.symbols[symbol.product_id].increment) {
        return n(s.next_sell_price).format(
          s.symbols[symbol.product_id].increment,
          Math.ceil
        );
      } else {
        return n(s.next_sell_price).value();
      }
    } else {
      if (s.symbols[symbol.product_id].inSignal === "short") {
        if (s.symbols[symbol.product_id].increment) {
          return n(quote.ask)
            .subtract(n(quote.ask).multiply(s.options.markup_sell_pct / 100))
            .format(s.symbols[symbol.product_id].increment, Math.ceil);
        } else {
          return n(quote.ask)
            .subtract(n(quote.ask).multiply(s.options.markup_sell_pct / 100))
            .value();
        }
      } else {
        if (s.symbols[symbol.product_id].increment) {
          return n(quote.ask)
            .add(n(quote.ask).multiply(s.options.markup_sell_pct / 100))
            .format(s.symbols[symbol.product_id].increment, Math.ceil);
        } else {
          return n(quote.ask)
            .add(n(quote.ask).multiply(s.options.markup_sell_pct / 100))
            .value();
        }
      }
    }
  }

  function executeStop(do_sell_stop, symbol) {
    if (!symbol) symbol = so.symbols[0];
    let stop_signal = false;
    if (s.symbols[symbol.product_id].my_trades.length) {
      var last_trade =
        s.symbols[symbol.product_id].my_trades[
          s.symbols[symbol.product_id].my_trades.length - 1
        ];
      if (last_trade.type === "buy") {
        s.symbols[symbol.product_id].last_trade_worth =
          (s.symbols[symbol.product_id].period.close -
            s.symbols[symbol.product_id].last_buy_price) /
          s.symbols[symbol.product_id].last_buy_price;
        if (s.options.future) {
          if (last_trade.position_side === "short") {
            s.symbols[symbol.product_id].last_trade_worth =
              (s.symbols[symbol.product_id].last_buy_price -
                s.symbols[symbol.product_id].period.close) /
              s.symbols[symbol.product_id].last_buy_price;
          }
          s.symbols[symbol.product_id].last_trade_worth =
            s.symbols[symbol.product_id].last_trade_worth *
            s.symbols[symbol.product_id].leverage;
        }
      } else {
        s.symbols[symbol.product_id].last_trade_worth =
          (s.symbols[symbol.product_id].period.close -
            s.symbols[symbol.product_id].last_buy_price) /
          s.symbols[symbol.product_id].last_buy_price;
        if (s.options.future) {
          if (last_trade.position_side === "short") {
            s.symbols[symbol.product_id].last_trade_worth =
              (s.symbols[symbol.product_id].last_buy_price -
                s.symbols[symbol.product_id].period.close) /
              s.symbols[symbol.product_id].last_buy_price;
          }
          s.symbols[symbol.product_id].last_trade_worth =
            s.symbols[symbol.product_id].last_trade_worth *
            s.symbols[symbol.product_id].leverage;
        }
      }
      /* logger.trace(
        symbol.product_id +
          " executeStop do_sell_stop " +
          " " +
          s.symbols[symbol.product_id].last_buy_type +
          " " +
          s.symbols[symbol.product_id].last_trade_worth
      ); */
      if (
        !s.symbols[symbol.product_id].inSignal &&
        !s.symbols[symbol.product_id].acted_on_stop
      ) {
        // logger.warn('should stop ', s.symbols[symbol.product_id].action, s.symbols[symbol.product_id].sell_stop, s.symbols[symbol.product_id].period.close)
        if (so.profit_stop_enable) {
          s.symbols[symbol.product_id].profit_stop_high = Math.max(
            s.symbols[symbol.product_id].profit_stop_high || 0,
            s.symbols[symbol.product_id].last_trade_worth
          );
          s.symbols[symbol.product_id].profit_stop =
            profitStop.getProfitStopPrice(symbol);
        }
        // logger.warn(symbol.product_id, s.symbols[symbol.product_id].action, s.symbols[symbol.product_id].sell_stop, s.symbols[symbol.product_id].period.close, do_sell_stop, s.symbols[symbol.product_id].last_buy_type)
        if (
          s.symbols[symbol.product_id].action &&
          (s.symbols[symbol.product_id].action === "bought" ||
            s.symbols[symbol.product_id].action === "partSell") &&
          do_sell_stop &&
          s.symbols[symbol.product_id].sell_stop &&
          s.symbols[symbol.product_id].last_buy_type &&
          (s.symbols[symbol.product_id].last_buy_type.indexOf("short") >= 0
            ? s.symbols[symbol.product_id].period.close >
              s.symbols[symbol.product_id].sell_stop
            : s.symbols[symbol.product_id].period.close <
              s.symbols[symbol.product_id].sell_stop)
        ) {
          logger.warn(
            symbol.product_id +
              " loss_stop_sell_ " +
              s.symbols[symbol.product_id].last_buy_type,
            s.symbols[symbol.product_id].last_buy_price,
            s.symbols[symbol.product_id].sell_stop,
            s.symbols[symbol.product_id].period.close
          );
          //  console.log('compir...', s.symbols[symbol.product_id].last_buy_type.indexOf('short') >= 0, s.symbols[symbol.product_id].period.close < s.symbols[symbol.product_id].sell_stop, s.symbols[symbol.product_id].last_buy_type && (s.symbols[symbol.product_id].last_buy_type.indexOf('short') >= 0 ? s.symbols[symbol.product_id].period.close > s.symbols[symbol.product_id].sell_stop : s.symbols[symbol.product_id].period.close < s.symbols[symbol.product_id].sell_stop))
          stop_signal = true;
          s.symbols[symbol.product_id].inSignal =
            s.symbols[symbol.product_id].last_buy_type &&
            s.symbols[symbol.product_id].last_buy_type.indexOf("short") >= 0
              ? "short"
              : "long";
          s.symbols[symbol.product_id].last_sell_type =
            "loss_stop_sell_" + s.symbols[symbol.product_id].inSignal;
          console.log(
            (
              "\n" +
              moment(
                s.symbols[symbol.product_id].period.latest_trade_time
              ).format("YYYY-MM-DD HH:mm:ss") +
              " " +
              s.symbols[symbol.product_id].last_sell_type.bgBlack +
              ", price: " +
              s.symbols[symbol.product_id].period.close
            ).green
          );
        }
        if (!stop_signal && so.profit_win_enable) {
          stop_signal = profitStop.checkProfitWin(symbol);
          /* logger.warn(
            symbol.product_id +
              " executeStop profit_win_enable " +
              " " +
              s.symbols[symbol.product_id].stop_signal
          ); */
          if (stop_signal) {
            console.log(
              (
                "\n" +
                moment(
                  s.symbols[symbol.product_id].period.latest_trade_time
                ).format("YYYY-MM-DD HH:mm:ss") +
                " " +
                s.symbols[symbol.product_id].last_sell_type.bgRed +
                ", start: " +
                formatPercent(s.symbols[symbol.product_id].last_trade_worth) +
                " > profit win set, price: " +
                s.symbols[symbol.product_id].period.close
              ).green
            );
          }
        }
        if (
          !stop_signal &&
          !s.symbols[symbol.product_id].has_profit_stop &&
          so.profit_stop_enable &&
          s.symbols[symbol.product_id].action &&
          (s.symbols[symbol.product_id].action === "bought" ||
            s.symbols[symbol.product_id].action === "partSell")
        ) {
          stop_signal = profitStop.checkProfitStop(symbol);
          if (stop_signal) {
            s.symbols[symbol.product_id].has_profit_stop = true;
            s.symbols[symbol.product_id].inSignal =
              s.symbols[symbol.product_id].last_buy_type &&
              s.symbols[symbol.product_id].last_buy_type.indexOf("short") >= 0
                ? "short"
                : "long";
            s.symbols[symbol.product_id].last_sell_type =
              "profit_stop_sell_" + s.symbols[symbol.product_id].inSignal;
            console.log(
              (
                "\n" +
                moment(
                  s.symbols[symbol.product_id].period.latest_trade_time
                ).format("YYYY-MM-DD HH:mm:ss") +
                " " +
                s.symbols[symbol.product_id].last_sell_type.bgRed +
                ", start: " +
                formatPercent(s.symbols[symbol.product_id].last_trade_worth) +
                " < " +
                formatPercent(s.symbols[symbol.product_id].profit_stop) +
                " / " +
                formatPercent(s.symbols[symbol.product_id].profit_stop_high) +
                ", price: " +
                s.symbols[symbol.product_id].period.close
              ).green
            );
          }
        }
        /* }
        else {
          // console.log('s.buy stop ', s.symbols[symbol.product_id].last_sell_type, s.symbols[symbol.product_id].signal, s.symbols[symbol.product_id].buy_order, s.symbols[symbol.product_id].action, s.symbols[symbol.product_id].buy_stop, s.symbols[symbol.product_id].period.close > s.symbols[symbol.product_id].buy_stop)
          if (!s.symbols[symbol.product_id].signal && !s.symbols[symbol.product_id].buy_order && (s.symbols[symbol.product_id].action && s.symbols[symbol.product_id].action === 'sold') && (s.symbols[symbol.product_id].buy_stop && (s.symbols[symbol.product_id].last_buy_type && (s.symbols[symbol.product_id].last_buy_type.indexOf('short') >= 0 ? s.symbols[symbol.product_id].period.close < s.symbols[symbol.product_id].buy_stop : s.symbols[symbol.product_id].period.close > s.symbols[symbol.product_id].buy_stop)))) {
            //  console.log('s.buy stop ', s.symbols[symbol.product_id].signal, s.symbols[symbol.product_id].action, s.symbols[symbol.product_id].buy_stop, s.symbols[symbol.product_id].last_buy_type)
            if (s.symbols[symbol.product_id].last_sell_type && (s.symbols[symbol.product_id].last_sell_type.indexOf('loss_stop_sell') >= 0 || s.symbols[symbol.product_id].last_sell_type.indexOf('profit_stop_sell') >= 0)) {
              s.symbols[symbol.product_id].inSignal = (s.symbols[symbol.product_id].last_buy_type && s.symbols[symbol.product_id].last_buy_type.indexOf('short') >= 0 ? 'short' : 'long')
              stop_signal = 'buy'
              s.symbols[symbol.product_id].last_buy_type = 'loss_stop_buy_' + s.symbols[symbol.product_id].inSignal
              console.log(('\n' + moment(s.symbols[symbol.product_id].period.latest_trade_time).format('YYYY-MM-DD HH:mm:ss') + ' ' + (s.symbols[symbol.product_id].last_buy_type).bgWhite + ', price: ' + s.symbols[symbol.product_id].period.close).green)
              s.symbols[symbol.product_id].loss_stop_buy_num++
            }
          }
        } */
      }
    }
    if (stop_signal) {
      s.symbols[symbol.product_id].signal = "sell";
      s.symbols[symbol.product_id].acted_on_stop = true;
    }
  }

  function syncBalance(cb, symbol) {
    if (!symbol) symbol = so.symbols[0];
    let position_side =
      s.symbols[symbol.product_id].last_buy_type &&
      s.symbols[symbol.product_id].last_buy_type.indexOf("short") >= 0
        ? "SHORT"
        : "LONG";
    try {
      s.exchange.getBalance(
        {
          position_side,
          currency: symbol.currency,
          asset: symbol.asset,
        },
        function (err, balance) {
          if (err) return cb(err);
          s.balance.currency = balance.currency;
          s.balance.currency_hold = balance.currency_hold;
          getQuote(function (err, quote) {
            if (err) return cb(err);
            if (!s.options.future) {
              s.symbols[symbol.product_id].asset_hold = balance.asset_hold;
              s.symbols[symbol.product_id].asset_amount = balance.asset;
              s.symbols[symbol.product_id].asset_capital = n(
                s.symbols[symbol.product_id].asset_amount
              )
                .multiply(quote.ask)
                .value();
              if (!s.symbols[symbol.product_id].start_price) {
                s.symbols[symbol.product_id].start_price = n(quote.ask).value();
              }
            } else {
              s.symbols[symbol.product_id].positionSide = balance.positionSide;
              s.symbols[symbol.product_id].asset_hold = balance.asset_hold;
              s.symbols[symbol.product_id].asset_amount = balance.asset;
              s.symbols[symbol.product_id].asset_capital = n(
                balance.unrealizedProfit
              ).value();
              s.symbols[symbol.product_id].leverage = balance.leverage;
              s.symbols[symbol.product_id].isolated = balance.isolated;
              if (!s.symbols[symbol.product_id].start_price) {
                s.symbols[symbol.product_id].start_price = n(quote.ask).value();
              }
              /* console.log(
                "syncBalance.",
                symbol.product_id,
                s.options.leverage,
                s.symbols[symbol.product_id].leverage
              ); */
              if (
                s.options.mode === "live" &&
                s.options.leverage &&
                parseInt(s.symbols[symbol.product_id].leverage) !==
                  parseInt(s.options.leverage)
              ) {
                s.exchange.updateLeverage(
                  {
                    leverage: s.options.leverage,
                    product_id: symbol.product_id,
                  },
                  function (err, res) {
                    if (err) return;
                    logger.debug(
                      symbol.product_id.cyan +
                        " updateLeverage from " +
                        s.symbols[symbol.product_id].leverage +
                        " to ".green +
                        s.options.leverage +
                        " ok".green
                    );
                    s.symbols[symbol.product_id].leverage = s.options.leverage;
                    // checkSymbols(cb, symbols, JSON.parse(JSON.stringify(symbols)))
                  }
                );
              }
            }
            /*  console.log('syncBalance', symbol.product_id, position_side, s.balance, {
             start_price: s.symbols[symbol.product_id].start_price,
             asset_amount: s.symbols[symbol.product_id].asset_amount,
             asset_capital: s.symbols[symbol.product_id].asset_capital
           }) */
            cb(null, { balance, quote });
          }, symbol);
        }
      );
    } catch (error) {
      logger.error("get banance error" + error);
    }
  }
  function initExchange(cb, position_side = "LONG") {
    if (!s.options.future && position_side === "SHORT") return cb(null, []);
    let symbol = s.options.symbols[0];
    try {
      s.exchange.getBalance(
        {
          position_side,
          currency: symbol.currency,
          asset: symbol.asset,
          symbols: s.options.symbols,
        },
        function (err, balance) {
          if (err) return cb(err, []);
          if (so.mode !== "live") {
            if (so.asset_capital > 0) {
              balance.assets = {};
              so.symbols.forEach((s) => {
                balance.assets[s.asset] = {
                  asset: so.asset_capital,
                  positionSide: position_side,
                };
              });
            }
          }
          if (!balance.assets) return cb(null, [], balance);
          delete balance.assets["NFT"];
          let exitSymbols = Object.keys(balance.assets).map((key) => {
            let sy = so.symbols.find((s) => s.asset === key);
            return Object.assign(balance.assets[key], {
              product_id: sy.product_id,
              normalized: sy.normalized,
            });
          });
          if (s.options.future) {
            exitSymbols = exitSymbols.filter(
              (xs) => xs.positionSide === position_side
            );
          }
          if (exitSymbols.length) {
            // console.log("exitSymbols", exitSymbols);
            s.exchange.getTickers(
              { symbols: JSON.parse(JSON.stringify(exitSymbols)) },
              function (err, realTickers) {
                // console.log("getTickers ok", realTickers);
                if (realTickers) {
                  Object.keys(realTickers).forEach((t) => {
                    let symbol = exitSymbols.find(
                      (s) => s.normalized === realTickers[t].normalized
                    );
                    if (symbol) {
                      symbol.capital = n(symbol.asset)
                        .multiply(realTickers[t].close)
                        .value();
                      symbol.init_price = realTickers[t].close;
                    }
                  });
                  //  console.log("exitSymbols2", exitSymbols);
                  return cb(err, exitSymbols, balance);
                }
                return cb(err, [], balance);
              }
            );
          } else {
            return cb(null, [], balance);
          }
          // checkSymbols(cb, symbols, JSON.parse(JSON.stringify(symbols)))
        }
      );
    } catch (error) {
      console.log("get error", error.message);
    }
  }
  function placeOrder(type, opts, cb, symbol) {
    if (!symbol) symbol = so.symbols[0];
    if (!s.symbols[symbol.product_id][type + "_order"]) {
      s.symbols[symbol.product_id][type + "_order"] = {
        price: opts.price,
        size: opts.size,
        fee: opts.fee,
        orig_size: opts.size,
        remaining_size: opts.size,
        position_side: opts.position_side,
        orig_price: opts.price,
        order_type: opts.is_taker ? "taker" : so.order_type,
        cancel_after: so.cancel_after || "day",
      };
    }
    let order = s.symbols[symbol.product_id][type + "_order"];
    order.price = opts.price;
    order.size = opts.size;
    order.fee = opts.fee;
    order.remaining_size = opts.size;

    if (isNaN(order.size) || isNaN(order.price) || isNaN(order.fee)) {
      // treat as a no-op.
      logger.warn("invalid order for " + type + ", aborting");
      return cb(null, false);
    }

    order.product_id = symbol.product_id;
    order.post_only = conf.post_only;
    logger.debug("placing " + type + " order..." + JSON.stringify(order));
    let order_copy = JSON.parse(JSON.stringify(order));
    // console.log('order_copy', order_copy)
    s.exchange[type](order_copy, function (err, api_order) {
      // console.log('buy_api_order', api_order)
      if (err) return cb(err);
      s.symbols[symbol.product_id].api_order = api_order;
      if (api_order.status === "rejected") {
        if (api_order.reject_reason === "post only") {
          // trigger immediate price adjustment and re-order
          logger.warn("post-only " + type + " failed, re-ordering");
          return cb(null, null);
        } else if (api_order.reject_reason === "balance") {
          // treat as a no-op.
          logger.warn("not enough balance for " + type + ", aborting");
          return cb(null, false);
        } else if (api_order.reject_reason === "price") {
          // treat as a no-op.
          logger.warn("invalid price for " + type + ", aborting");
          return cb(null, false);
        }
        err = new Error("\norder rejected");
        err.order = api_order;
        return cb(err);
      }
      logger.debug(
        type +
          " order placed at " +
          formatCurrency(order.price, symbol.currency)
      );
      order.order_id = api_order.id;
      if (!order.time) {
        order.orig_time = new Date(api_order.created_at).getTime();
      }
      order.time = new Date(api_order.created_at).getTime();
      order.local_time = now();
      order.status = api_order.status;
      // console.log('orderorderorder', order)
      //console.log('\ncreated ' + order.status + ' ' + type + ' order: ' + formatAsset(order.size) + ' at ' + formatCurrency(order.price) + ' (total ' + formatCurrency(n(order.price).multiply(order.size)) + ')\n')
      // console.log('xxxxxxxxxxxxxxxxxxx2', so.order_poll_time)
      setTimeout(function () {
        checkOrder(order, type, cb, symbol);
      }, so.order_poll_time);
    });
  }

  function getQuote(cb, symbol) {
    if (!symbol) symbol = so.symbols[0];
    s.exchange.getQuote(
      { product_id: symbol.product_id },
      function (err, quote) {
        if (err) return cb(err);
        s.symbols[symbol.product_id].quote = quote;
        cb(null, quote);
      }
    );
  }
  function isOrderLiquidityTooSmall(product, liquid) {
    if (
      s.exchange.defi &&
      liquid &&
      parseInt(liquid) <= parseInt(s.options.defi.dailyVolumeUSD)
    ) {
      logger.warn(
        "isOrderLiquidityTooSmall",
        liquid,
        parseInt(s.options.defi.dailyVolumeUSD)
      );
      return true;
    }
    return false;
  }
  function isOrderTooSmall(product, quantity, price) {
    if (product.min_size && Number(quantity) < Number(product.min_size)) {
      // console.log('isOrderTooSmall quantity', product.asset, product.min_size, Number(quantity), Number(product.min_size))
      return true;
    }

    if (
      product.min_total &&
      n(quantity).multiply(price).value() < Number(product.min_total)
    ) {
      //  console.log('isOrderTooSmall min_total', product.min_total, Number(quantity), Number(price))
      return true;
    }

    return false;
  }

  // if s.symbols[symbol.product_id].signal
  // 1. sync balance
  // 2. get quote
  // 3. calculate size/price
  // 4. validate size against min/max sizes
  // 5. cancel old orders
  // 6. place new order
  // 7. record order ID and start poll timer
  // 8. if not filled after timer, repeat process
  // 9. if filled, record order stats
  function executeSignal(
    signal,
    _cb,
    size,
    is_reorder,
    is_taker,
    reverseCalled,
    symbol
  ) {
    if (!symbol) symbol = so.symbols[0];
    let price, expected_fee, buy_pct, sell_pct, trades;
    delete s.symbols[symbol.product_id][
      (signal === "buy" ? "sell" : "buy") + "_order"
    ];
    s.symbols[symbol.product_id].last_signal = signal;
    if (!is_reorder && s.symbols[symbol.product_id][signal + "_order"]) {
      if (is_taker)
        s.symbols[symbol.product_id][signal + "_order"].order_type = "taker";
      // order already placed
      _cb && _cb(null, null);
      return;
    }
    s.symbols[symbol.product_id].acted_on_trend = true;
    let cb = function (err, order) {
      // console.log('\ncb....', err, signal, s.symbols[symbol.product_id].inSignal, s.re_picker)
      // logger.info("order callback ", err, order);
      if (!order) {
        if (signal === "buy") delete s.symbols[symbol.product_id].buy_order;
        else delete s.symbols[symbol.product_id].sell_order;
      }
      //   console.log('s', s)
      if (signal === "buy") {
        delete s.symbols[symbol.product_id].has_use_revert_sell;
        delete s.symbols[symbol.product_id].has_profit_win_first_sell;
        delete s.symbols[symbol.product_id].has_profit_win_second_sell;
        delete s.symbols[symbol.product_id].has_profit_win_third_sell;
        delete s.symbols[symbol.product_id].has_profit_win_max_sell;
        delete s.symbols[symbol.product_id].has_profit_stop;
      } else {
        delete s.symbols[symbol.product_id].has_first_buy;
        delete s.symbols[symbol.product_id].has_second_buy;
        delete s.symbols[symbol.product_id].has_third_buy;
        delete s.symbols[symbol.product_id].has_max_buy;
      }
      delete s.symbols[symbol.product_id].inSignal;
      delete s.symbols[symbol.product_id].inBuyPositionSide;
      if (_cb) _cb(err, order);
      else if (err) {
        if (err.message && err.message.match(nice_errors)) {
          console.error((err.message + ": " + err.desc).red);
        } else {
          memDump();
          console.error("\n");
          console.error(err);
          console.error("\n");
        }
      }
    };
    syncBalance(function (err, { quote }) {
      let reorder_pct, fee, trade_balance, tradeable_balance;
      if (err) {
        logger.error(symbol.product_id, "error getting balance");
        err.desc = "could not execute " + signal + ": error fetching quote";
        return cb(err);
      }
      if (is_reorder && s.symbols[symbol.product_id][signal + "_order"]) {
        if (signal === "buy") {
          if (s.options.future) {
            reorder_pct = so.buy_pct;
          } else {
            reorder_pct = n(size)
              .multiply(s.symbols[symbol.product_id].buy_order.price)
              .add(s.symbols[symbol.product_id].buy_order.fee)
              .divide(s.balance.currency)
              .multiply(100);
          }
        } else {
          if (s.options.future) {
            reorder_pct = so.buy_pct;
          } else {
            reorder_pct = n(size)
              .divide(s.symbols[symbol.product_id].asset_amount)
              .multiply(100);
          }
        }
        logger.warn(
          symbol.product_id +
            " price changed, resizing order, " +
            reorder_pct +
            "% remain"
        );
        size = null;
      }
      trades = _.cloneDeep(s.symbols[symbol.product_id].my_trades);
      if (signal === "buy") {
        price = nextBuyForQuote(s, quote, symbol);
        if (is_reorder) {
          buy_pct = reorder_pct || so.buy_pct;
        } else {
          buy_pct = so.buy_pct;
          if (
            s.symbols[symbol.product_id].inSignal === "short" &&
            so.short_buy_pct
          ) {
            buy_pct = so.short_buy_pct;
          }
          if (s.symbols[symbol.product_id].last_buy_type) {
            if (
              s.symbols[symbol.product_id].last_buy_type.indexOf("first_") >= 0
            ) {
              buy_pct = s.options.rain_first_buy_percent;
            } else if (
              s.symbols[symbol.product_id].last_buy_type.indexOf("second_") >= 0
            ) {
              buy_pct = s.options.rain_second_buy_percent;
            } else if (
              s.symbols[symbol.product_id].last_buy_type.indexOf("third_") >= 0
            ) {
              buy_pct = s.options.rain_third_buy_percent;
            } else if (
              s.symbols[symbol.product_id].last_buy_type.indexOf("max_") >= 0
            ) {
              buy_pct = s.options.rain_max_buy_percent;
            }
          }
          if (size) {
            buy_pct = parseFloat(
              n(100 * size)
                .divide(s.balance.currency)
                .format("0.00", Math.floor)
            );
            if (buy_pct > so.buy_pct) {
              buy_pct = so.buy_pct;
            }
          }
        }
        if (so.use_fee_asset) {
          fee = 0;
        } else if (
          so.order_type === "maker" &&
          (buy_pct + s.exchange.takerFee < 100 ||
            !s.exchange.makerBuy100Workaround)
        ) {
          fee = s.exchange.makerFee;
        } else if (so.future && so.order === "maker" && so.post_only) {
          fee = s.exchange.makerFee;
        } else {
          fee = s.exchange.takerFee;
        }
        if (s.options.future) {
          // console.log('buy size', buy_pct, s.balance.currency, s.symbols[symbol.product_id].leverage)
          if (so.mode === "live")
            trade_balance = n(s.balance.currency)
              .divide(100)
              .multiply(buy_pct)
              .multiply(n(s.symbols[symbol.product_id].leverage));
          else
            trade_balance = n(s.balance.currency).divide(100).multiply(buy_pct);

          if (so.max_buy_size && trade_balance > so.max_buy_size) {
            trade_balance = so.max_buy_size;
            //console.log('buy max_buy_size', trade_balance)
          }
          if (so.min_buy_size && trade_balance < so.min_buy_size) {
            trade_balance = so.min_buy_size;
            // console.log('buy min_buy_size', trade_balance)
          }
          if (so.mode === "live")
            tradeable_balance = n(s.balance.currency)
              .divide(100 + fee)
              .multiply(buy_pct)
              .multiply(n(s.symbols[symbol.product_id].leverage));
          else
            tradeable_balance = n(s.balance.currency)
              .divide(100)
              .multiply(buy_pct);
          // console.log('trade_balance', trade_balance, tradeable_balance)
        } else {
          trade_balance = n(s.balance.currency).divide(100).multiply(buy_pct);
          //  console.log('trade_balance', trade_balance)
          if (so.max_buy_size && trade_balance > so.max_buy_size) {
            trade_balance = so.max_buy_size;
          }
          if (so.min_buy_size && trade_balance < so.min_buy_size) {
            trade_balance = so.min_buy_size;
          }
          tradeable_balance = n(s.balance.currency)
            .divide(100 + fee)
            .multiply(buy_pct);
        }
        // console.log('trade_balance 2', trade_balance)
        //  console.log('tradeable_balance ', tradeable_balance)
        //console.log(symbol.product_id.green, s.options.future, s.symbols[symbol.product_id].leverage, trade_balance, tradeable_balance)
        expected_fee = n(trade_balance)
          .subtract(tradeable_balance)
          .format(so.price_format, Math.ceil); // round up as the exchange will too
        //  console.log('expected_fee', expected_fee)
        if (buy_pct + fee < 100) {
          // console.log('s.symbols[symbol.product_id]', tradeable_balance, price, s.symbols[symbol.product_id].asset_increment, n(tradeable_balance).divide(price))
          size = n(tradeable_balance)
            .divide(price)
            .format(
              s.symbols[symbol.product_id].asset_increment
                ? s.symbols[symbol.product_id].asset_increment
                : so.price_format
            );
        } else {
          size = n(trade_balance)
            .subtract(expected_fee)
            .divide(price)
            .format(
              s.symbols[symbol.product_id].asset_increment
                ? s.symbols[symbol.product_id].asset_increment
                : so.price_format
            );
        }
        if (
          s.symbols[symbol.product_id].max_size &&
          Number(size) > Number(s.symbols[symbol.product_id].max_size)
        ) {
          size = s.symbols[symbol.product_id].max_size;
        }
        // console.log('buy', price, buy_pct, size, price * size)
        if (isOrderTooSmall(s.symbols[symbol.product_id], size, price)) {
          //console.log('\nbuy cancel order is too small!')
          return cb("order is too small", null);
        }

        if (
          isOrderLiquidityTooSmall(
            s.symbols[symbol.product_id],
            quote.dayVolume
          )
        ) {
          //console.log('\nbuy cancel order is too small!')
          return cb("order liquidity is too small", null);
        }
        logger.debug(
          "preparing buy order over " +
            formatAsset(size, symbol.asset) +
            " of " +
            formatCurrency(tradeable_balance, symbol.currency) +
            " (" +
            buy_pct +
            "%) tradeable balance with a expected fee of " +
            formatCurrency(expected_fee, symbol.currency) +
            " (" +
            fee +
            "%)"
        );
        if (
          so.quarentine_time > 0 &&
          s.buy_quarentine_time &&
          moment
            .duration(moment(now()).diff(s.buy_quarentine_time))
            .asMinutes() < so.quarentine_time
        ) {
          //console.log(('\nbuy cancel quarentine time: ' + moment(s.buy_quarentine_time).format('YYYY-MM-DD HH:mm:ss')).red)
          return cb(null, null);
        }
        let latest_low_sell = _.chain(trades)
          .dropRightWhile(["type", "buy"])
          .takeRightWhile(["type", "sell"])
          .sortBy(["price"])
          .head()
          .value(); // return lowest price
        let buy_loss = latest_low_sell
          ? ((latest_low_sell.price - Number(price)) / latest_low_sell.price) *
            -100
          : null;
        // console.log('buy price ', price, 'latest_low_sell ', latest_low_sell, 'buy_loss', buy_loss)

        if (so.max_buy_loss_pct && buy_loss > so.max_buy_loss_pct) {
          let err = new Error("\nloss protection");
          err.desc =
            "refusing to buy at " +
            formatCurrency(price, symbol.currency) +
            ", buy loss of " +
            formatPercent(buy_loss / 100);
          return cb(err);
        }
        // console.log('so.max_slippage_pct', s.symbols[symbol.product_id].buy_order, so.max_slippage_pct)
        if (
          s.symbols[symbol.product_id].buy_order &&
          so.max_slippage_pct != null
        ) {
          let slippage = n(price)
            .subtract(s.symbols[symbol.product_id].buy_order.orig_price)
            .divide(s.symbols[symbol.product_id].buy_order.orig_price)
            .multiply(100)
            .value();
          if (s.symbols[symbol.product_id].inSignal === "short") {
            slippage = n(s.symbols[symbol.product_id].buy_order.orig_price)
              .subtract(price)
              .divide(price)
              .multiply(100)
              .value();
          }
          //  console.log('slippage buy', s.symbols[symbol.product_id].inSignal, slippage)
          if (so.max_slippage_pct != null && slippage > so.max_slippage_pct) {
            let err = new Error("\nslippage protection");
            err.desc =
              "refusing to buy at " +
              formatCurrency(price, symbol.currency) +
              ", slippage of " +
              formatPercent(slippage / 100);
            return cb(err);
          }
        }
        /* console.log('buy options', {
          buy_pct,
          trade_balance,
          tradeable_balance,
          expected_fee,
          size,
          buy_loss,
          fee
        }) */
        let noEnoughMoney =
          n(s.balance.currency)
            .subtract(s.balance.currency_hold || 0)
            .value() < n(price).multiply(size).value();
        if (s.options.future) {
          noEnoughMoney =
            n(s.balance.currency)
              .subtract(s.balance.currency_hold || 0)
              .value() <
            n(price).multiply(size).value() /
              s.symbols[symbol.product_id].leverage;
        }
        if (noEnoughMoney && s.balance.currency_hold > 0) {
          logger.warn(
            symbol.product_id +
              " buy delayed: " +
              formatPercent(
                n(s.balance.currency_hold || 0)
                  .divide(s.balance.currency)
                  .value()
              ) +
              " of funds (" +
              formatCurrency(s.balance.currency_hold, symbol.currency) +
              ") on hold"
          );
          return setTimeout(function () {
            if (s.symbols[symbol.product_id].last_signal === signal) {
              executeSignal(signal, cb, size, true, false, false, symbol);
            }
          }, conf.wait_for_settlement);
        }
        doOrder();
      } else if (signal === "sell") {
        price = nextSellForQuote(s, quote, symbol);

        if (is_reorder) {
          sell_pct = reorder_pct;
          if (!sell_pct) {
            sell_pct = so.sell_pct;
          }
        } else {
          sell_pct = so.sell_pct;
          if (s.symbols[symbol.product_id].last_sell_type) {
            if (
              s.symbols[symbol.product_id].last_sell_type.indexOf("first_") >= 0
            ) {
              sell_pct = s.options.profit_win_first_percent;
            } else if (
              s.symbols[symbol.product_id].last_sell_type.indexOf("second_") >=
              0
            ) {
              sell_pct = s.options.profit_win_second_percent;
            } else if (
              s.symbols[symbol.product_id].last_sell_type.indexOf("third_") >= 0
            ) {
              sell_pct = s.options.profit_win_third_percent;
            } else if (
              s.symbols[symbol.product_id].last_sell_type.indexOf("max_") >= 0
            ) {
              sell_pct = s.options.profit_win_max_percent;
            } else if (
              s.symbols[symbol.product_id].last_sell_type.indexOf(
                "profit_stop_"
              ) >= 0
            ) {
              sell_pct = s.options.profit_stop_percent;
            }
          }
        }
        // console.log('sell_pct 1', sell_pct)
        if (size) {
          sell_pct = parseFloat(
            n(100 * size)
              .divide(s.symbols[symbol.product_id].asset_amount)
              .format("0.00", Math.floor)
          );
          if (sell_pct > so.sell_pct) {
            sell_pct = so.sell_pct;
          }
        }

        size = n(s.symbols[symbol.product_id].asset_amount)
          .multiply(sell_pct / 100)
          .format(
            s.symbols[symbol.product_id].asset_increment
              ? s.symbols[symbol.product_id].asset_increment
              : so.price_format
          );
        /* if (n(s.symbols[symbol.product_id].asset_amount).subtract(size) < s.symbols[symbol.product_id].min_size) {
          size = n(s.symbols[symbol.product_id].asset_amount).format(s.symbols[symbol.product_id].asset_increment ? s.symbols[symbol.product_id].asset_increment : so.price_format)
        } */

        if (s.options.future) {
          //TODO:win first sell all
          if (
            s.symbols[symbol.product_id].min_size &&
            n(s.symbols[symbol.product_id].asset_amount)
              .subtract(size)
              .value() > 0 &&
            n(s.symbols[symbol.product_id].asset_amount)
              .subtract(size)
              .value() <= s.symbols[symbol.product_id].min_size
          ) {
            let oldSize = size;
            size = n(s.symbols[symbol.product_id].asset_amount).format(
              s.symbols[symbol.product_id].asset_increment
                ? s.symbols[symbol.product_id].asset_increment
                : so.price_format
            );
            // console.log('Sell future size'.green, ' from oldSize ', oldSize, 'min_size', s.symbols[symbol.product_id].min_size, ' resize to...', size)
          }
        } else {
          if (
            s.symbols[symbol.product_id].min_size &&
            n(s.symbols[symbol.product_id].asset_amount)
              .subtract(size)
              .value() > 0 &&
            n(s.symbols[symbol.product_id].asset_amount)
              .subtract(size)
              .value() <= s.symbols[symbol.product_id].min_size
          ) {
            let oldSize = size;
            size = n(s.symbols[symbol.product_id].asset_amount).format(
              s.symbols[symbol.product_id].asset_increment
                ? s.symbols[symbol.product_id].asset_increment
                : so.price_format
            );
            console.log(
              "Sell spot size".green,
              " from oldSize ",
              oldSize,
              " resize to...",
              size
            );
          }
          if (
            so.min_buy_size &&
            n(s.symbols[symbol.product_id].asset_amount)
              .subtract(size)
              .multiply(price)
              .value() <= so.min_buy_size
          ) {
            let oldSize = size;
            //  console.log('resize to...')
            size = n(s.symbols[symbol.product_id].asset_amount).format(
              s.symbols[symbol.product_id].asset_increment
                ? s.symbols[symbol.product_id].asset_increment
                : so.price_format
            );
            console.log(
              "Sell min_buy_size".green,
              " from oldSize ",
              oldSize,
              " resize to...",
              size
            );
          }
        }
        if (
          s.symbols[symbol.product_id].max_size &&
          Number(size) > Number(s.symbols[symbol.product_id].max_size)
        ) {
          size = n(s.symbols[symbol.product_id].max_size).format(
            s.symbols[symbol.product_id].asset_increment
              ? s.symbols[symbol.product_id].asset_increment
              : so.price_format
          );
        }
        // console.log('size', size, 'toal', s.symbols[symbol.product_id].asset_amount, 'remain_size', n(s.symbols[symbol.product_id].asset_amount).subtract(size).value(), 'remain usdt size', n(s.symbols[symbol.product_id].asset_amount).subtract(size).multiply(price).value(), 'min size', so.min_buy_size, 'sell_pct', sell_pct)
        if (isOrderTooSmall(s.symbols[symbol.product_id], size, price))
          return cb("order is too small", null);
        let latest_high_buy = _.chain(trades)
          .dropRightWhile(["type", "sell"])
          .takeRightWhile(["type", "buy"])
          .sortBy(["price"])
          .reverse()
          .head()
          .value(); // return highest price
        let sell_loss = latest_high_buy
          ? ((Number(price) - latest_high_buy.price) / latest_high_buy.price) *
            -100
          : null;
        if (
          latest_high_buy &&
          so.sell_cancel_pct != null &&
          Math.abs(sell_loss) < so.sell_cancel_pct
        ) {
          console.log(
            (
              "\nsell_cancel_pct: refusing to sell at " +
              formatCurrency(latest_high_buy.price, symbol.currency) +
              "-" +
              formatCurrency(price, symbol.currency) +
              ", sell loss of " +
              formatPercent(sell_loss / 100) +
              " - " +
              formatPercent(so.sell_cancel_pct / 100) +
              "\n"
            ).red
          );
          return cb(null, null);
        }
        //    console.log('executeSignal 3')
        if (so.max_sell_loss_pct && sell_loss > so.max_sell_loss_pct) {
          console.log(
            "\nso.max_sell_loss_pct",
            so.max_sell_loss_pct,
            so.max_sell_loss_pct === null
          );
          let err = new Error("\nloss protection");
          err.desc =
            "refusing to sell at " +
            formatCurrency(price, symbol.currency) +
            ", sell loss of " +
            formatPercent(sell_loss / 100);
          return cb(err);
        }
        // console.log('so.max_slippage_pct', s.symbols[symbol.product_id].sell_order, so.max_slippage_pct, price)
        if (
          s.symbols[symbol.product_id].sell_order &&
          so.max_slippage_pct != null
        ) {
          let slippage = n(s.symbols[symbol.product_id].sell_order.orig_price)
            .subtract(price)
            .divide(price)
            .multiply(100)
            .value();
          if (s.symbols[symbol.product_id].inSignal === "short") {
            slippage = n(price)
              .subtract(s.symbols[symbol.product_id].sell_order.orig_price)
              .divide(s.symbols[symbol.product_id].sell_order.orig_price)
              .multiply(100)
              .value();
          }
          // console.log('slippage sell', s.symbols[symbol.product_id].inSignal, slippage)
          if (slippage > so.max_slippage_pct) {
            let err = new Error("\nslippage protection");
            err.desc =
              "refusing to sell at " +
              formatCurrency(price, symbol.currency) +
              ", slippage of " +
              formatPercent(slippage / 100);
            return cb(err);
          }
        }
        if (
          n(s.symbols[symbol.product_id].asset_amount)
            .subtract(s.symbols[symbol.product_id].asset_amount_hold || 0)
            .value() < n(size).value()
        ) {
          logger.warn(
            symbol.product_id +
              " sell delayed: asset_amount:" +
              (s.symbols[symbol.product_id].asset_amount || 0) +
              ",asset_amount_hold:" +
              (s.symbols[symbol.product_id].asset_amount_hold || 0) +
              ",sell size:" +
              n(size).value()
          );
          size = n(s.symbols[symbol.product_id].asset_amount).format(
            s.symbols[symbol.product_id].asset_increment
              ? s.symbols[symbol.product_id].asset_increment
              : so.price_format
          );
          /* return setTimeout(function () {
            if (s.symbols[symbol.product_id].last_signal === signal) {
              executeSignal(signal, cb, size, true, false, false, symbol)
            }
          }, conf.wait_for_settlement) */
        }

        doOrder();
      }
    }, symbol);
    function doOrder() {
      placeOrder(
        signal,
        {
          size: size,
          price: price,
          fee: expected_fee || null,
          is_taker: is_taker,
          position_side:
            s.symbols[symbol.product_id].inSignal === "short"
              ? "SHORT"
              : "LONG",
          cancel_after: so.cancel_after || "day",
        },
        function (err, order) {
          if (err) {
            err.desc = "could not execute " + signal + ": error placing order";
            return cb(err);
          }
          if (!order) {
            if (order === false) {
              // not enough balance, or signal switched.

              logger.warn(
                "not enough balance, or signal switched, cancel " + signal
              );
              return cb(null, null);
            }
            if (s.symbols[symbol.product_id].last_signal !== signal) {
              // order timed out but a new signal is taking its place
              logger.warn("signal switched, cancel " + signal);
              return cb(null, null);
            }
            // order timed out and needs adjusting
            logger.warn(signal + " order timed out, adjusting price");
            let remaining_size = s.symbols[symbol.product_id][signal + "_order"]
              ? s.symbols[symbol.product_id][signal + "_order"].remaining_size
              : size;
            if (remaining_size !== size) {
              logger.warn("remaining size: " + remaining_size);
            }
            return executeSignal(
              signal,
              _cb,
              remaining_size,
              true,
              false,
              false,
              symbol
            );
          }
          cb(null, order);
        },
        symbol
      );
    }
  }

  // Called after an order has been completed.
  // trade_type is either 'buy' or 'sell'
  function executeOrder(order, trade_type, symbol) {
    if (!symbol) symbol = so.symbols[0];
    let order_type = so.order_type || "maker"; // "maker" or "taker"
    let price = order.price;
    let fee = 0;
    let percentage_fee = 0;
    if (order_type === "maker" && s.exchange.makerFee)
      percentage_fee = s.exchange.makerFee;
    else if (order_type === "taker" && s.exchange.takerFee)
      percentage_fee = s.exchange.takerFee;
    if (trade_type === "sell")
      fee = n(order.size)
        .multiply(percentage_fee / 100)
        .multiply(price)
        .value();
    else if (trade_type === "buy")
      fee = n(order.size)
        .multiply(percentage_fee / 100)
        .multiply(price)
        .value();

    s.symbols[symbol.product_id].action =
      trade_type === "sell" ? "sold" : "bought";
    if (
      trade_type === "sell" &&
      s.symbols[symbol.product_id].last_sell_type &&
      s.symbols[symbol.product_id].last_sell_type.indexOf("profit_win") >= 0
    ) {
      s.symbols[symbol.product_id].action = "partSell";
    } else if (
      trade_type === "sell" &&
      s.symbols[symbol.product_id].last_sell_type &&
      s.symbols[symbol.product_id].last_sell_type.indexOf("profit_stop") >= 0 &&
      s.options.profit_stop_percent < 100
    ) {
      s.symbols[symbol.product_id].action = "partSell";
    }
    if (
      trade_type === "sell" &&
      s.symbols[symbol.product_id].min_size &&
      s.symbols[symbol.product_id].asset_amount <=
        s.symbols[symbol.product_id].min_size
    ) {
      s.symbols[symbol.product_id].action = "sold";
      console.log(
        "change to sold by min_size".green,
        s.symbols[symbol.product_id].min_size,
        "remain asset".green,
        s.symbols[symbol.product_id].asset_amount
      );
    }
    // console.log('s.symbols[symbol.product_id].action', s.symbols[symbol.product_id].action)
    // console.log('order.size', s.symbols[symbol.product_id].action, order.size, s.symbols[symbol.product_id].asset_amount)
    // Compute profit from the last order price.
    let last_price_type = `last_${trade_type}_price`;
    let profit = 0;
    let usdtProfit = 0;
    if (trade_type === "sell") {
      if (s.options.future && so.mode !== "live") {
        usdtProfit = n(price)
          .subtract(s.symbols[symbol.product_id]["last_buy_price"])
          .multiply(order.size)
          .multiply(s.symbols[symbol.product_id].leverage)
          .subtract(fee)
          .value();
        profit = n(usdtProfit)
          .divide(
            n(s.symbols[symbol.product_id]["last_buy_price"]).multiply(
              order.size
            )
          )
          .value();
        if (
          s.symbols[symbol.product_id].last_buy_type &&
          s.symbols[symbol.product_id].last_buy_type.indexOf("short") >= 0
        ) {
          usdtProfit = n(s.symbols[symbol.product_id]["last_buy_price"])
            .subtract(price)
            .multiply(order.size)
            .multiply(s.symbols[symbol.product_id].leverage)
            .subtract(fee)
            .value();
          profit = n(usdtProfit)
            .divide(
              n(s.symbols[symbol.product_id]["last_buy_price"]).multiply(
                order.size
              )
            )
            .value();
        }
      } else {
        usdtProfit = n(price)
          .subtract(s.symbols[symbol.product_id]["last_buy_price"])
          .multiply(order.size)
          .subtract(fee)
          .value();
        profit = n(usdtProfit)
          .divide(
            n(s.symbols[symbol.product_id]["last_buy_price"]).multiply(
              order.size
            )
          )
          .value();
        if (
          s.symbols[symbol.product_id].last_buy_type &&
          s.symbols[symbol.product_id].last_buy_type.indexOf("short") >= 0
        ) {
          usdtProfit = n(s.symbols[symbol.product_id]["last_buy_price"])
            .subtract(price)
            .multiply(order.size)
            .subtract(fee)
            .value();
          profit = n(usdtProfit)
            .divide(
              n(s.symbols[symbol.product_id]["last_buy_price"]).multiply(
                order.size
              )
            )
            .value();
        }
      }
    } else {
      usdtProfit = -fee;
      profit = n(usdtProfit).divide(n(price).multiply(order.size)).value();
    }
    if (trade_type === "buy") {
      s.symbols[symbol.product_id]["lastBuyUsdtprofit"] = 0;
    }
    if (
      trade_type === "sell" &&
      s.symbols[symbol.product_id].action === "partSell"
    ) {
      s.symbols[symbol.product_id]["lastBuyUsdtprofit"] += usdtProfit;
    }
    if (
      trade_type === "sell" &&
      s.symbols[symbol.product_id].action === "sold"
    ) {
      s.symbols[symbol.product_id]["lastBuyUsdtprofit"] += usdtProfit;
      // console.log(symbol.product_id.red, 'lastBuyUsdtprofit>>>>'.red, s.symbols[symbol.product_id]['lastBuyUsdtprofit'])
      if (s.symbols[symbol.product_id]["lastBuyUsdtprofit"] < 0) {
        s.symbols[symbol.product_id].lost++;
      } else if (s.symbols[symbol.product_id]["lastBuyUsdtprofit"] > 0) {
        s.symbols[symbol.product_id].win++;
      }
      s.symbols[symbol.product_id].winLostRate =
        s.symbols[symbol.product_id].win + s.symbols[symbol.product_id].lost > 0
          ? s.symbols[symbol.product_id].win /
            (s.symbols[symbol.product_id].win +
              s.symbols[symbol.product_id].lost)
          : 0;
    }

    s.symbols[symbol.product_id].usdtProfit += usdtProfit;
    s.symbols[symbol.product_id].profit += profit;
    // console.log('usdtProfit', usdtProfit, profit)

    // let profit = s.symbols[symbol.product_id][last_price_type] && (s.symbols[symbol.product_id][last_price_type] - price) / s.symbols[symbol.product_id][last_price_type]
    // console.log('profitprofit', s[`last_${trade_type}_type`])
    s.symbols[symbol.product_id][last_price_type] = price;
    s.symbols[symbol.product_id].last_trade_time = order.time;

    if (trade_type === "sell" && so.same_period_multi_buy) {
      s.symbols[symbol.product_id].last_sell_period =
        s.symbols[symbol.product_id].period.period_id;
    }
    let my_trade = {
      order_id: order.order_id,
      time: order.time,
      execution_time: order.time - order.orig_time,
      slippage:
        trade_type === "sell"
          ? n(order.orig_price).subtract(price).divide(price).value()
          : n(price)
              .subtract(order.orig_price)
              .divide(order.orig_price)
              .value(),
      type: trade_type,
      size: order.orig_size,
      fee: fee,
      price: price,
      order_type: order_type,
      action: s.symbols[symbol.product_id]["last_" + trade_type + "_type"],
      profit: profit,
      usdtProfit: usdtProfit,
      position_side: s.symbols[symbol.product_id].inSignal,
    };
    // console.log('executeOrder', my_trade)
    //  console.log('my_trade,usdtProfit', my_trade.usdtProfit)
    if (trade_type === "buy") my_trade.cancel_after = so.cancel_after || "day";
    s.symbols[symbol.product_id].my_trades.push(my_trade);
    if (!s.symbols[symbol.product_id].new_trades) {
      s.symbols[symbol.product_id].new_trades = [];
    }
    s.symbols[symbol.product_id].new_trades.push(my_trade);
    if (so.stats) {
      let execution_time = moment.duration(my_trade.execution_time).humanize();
      let completion_time = moment(order.time).format("YYYY-MM-DD HH:mm:ss");
      let asset_qty = formatAsset(my_trade.size, symbol.asset);
      let currency_price = formatCurrency(my_trade.price, symbol.currency);
      let total_price = formatCurrency(
        my_trade.size * my_trade.price,
        symbol.currency
      );
      let slippage = n(my_trade.slippage).format("0.0000%");
      let orig_price = formatCurrency(order.orig_price, symbol.currency);
      let order_complete =
        `\n${trade_type} order completed at ${completion_time}:\n\n` +
        `${asset_qty} at ${currency_price}\n` +
        `total ${total_price}\n` +
        `${slippage} slippage (orig. price ${orig_price})\n` +
        `execution: ${execution_time}\n`;
      console.log(order_complete.cyan);
    }

    if (trade_type == "sell" && !isNaN(profit) && profit <= 0) {
      s.buy_quarentine_time = now();
    }

    if (trade_type === "buy") delete s.symbols[symbol.product_id].buy_order;
    else delete s.symbols[symbol.product_id].sell_order;
    // console.log('s.symbols[symbol.product_id].action', s.symbols[symbol.product_id].action)
    if (
      trade_type === "sell" &&
      s.symbols[symbol.product_id].action !== "partSell"
    ) {
      delete s.symbols[symbol.product_id].buy_stop;
      delete s.symbols[symbol.product_id].sell_stop;
    }
    if (trade_type === "buy" && so.sell_stop_pct) {
      s.symbols[symbol.product_id].sell_stop = n(price)
        .subtract(n(price).multiply(so.sell_stop_pct / 100))
        .value();
      if (s.symbols[symbol.product_id].inSignal === "short") {
        s.symbols[symbol.product_id].sell_stop = n(price)
          .add(n(price).multiply(so.sell_stop_pct / 100))
          .value();
      }
    } else if (trade_type === "sell" && so.buy_stop_pct) {
      if (
        s.symbols[symbol.product_id].last_sell_type &&
        s.symbols[symbol.product_id].last_sell_type.indexOf(
          "profit_stop_sell"
        ) >= 0
      ) {
        s.symbols[symbol.product_id].buy_stop = n(price)
          .add(n(price).multiply(so.buy_profit_pct / 100))
          .value();
        if (s.symbols[symbol.product_id].inSignal === "short") {
          s.symbols[symbol.product_id].buy_stop = n(price)
            .subtract(n(price).multiply(so.buy_profit_pct / 100))
            .value();
        }
      } else {
        s.symbols[symbol.product_id].buy_stop = n(price)
          .add(n(price).multiply(so.buy_stop_pct / 100))
          .value();
        if (s.symbols[symbol.product_id].inSignal === "short") {
          s.symbols[symbol.product_id].buy_stop = n(price)
            .subtract(n(price).multiply(so.buy_stop_pct / 100))
            .value();
        }
      }
      // console.log('s.symbols[symbol.product_id].buy_stop', s.symbols[symbol.product_id].buy_stop, ' price', price)
    }
    // console.log('s.symbols[symbol.product_id].sell_stop', s.symbols[symbol.product_id].sell_stop, ' buy stop', s.symbols[symbol.product_id].buy_stop)
    delete s.symbols[symbol.product_id].profit_stop;
    delete s.symbols[symbol.product_id].profit_stop_high;

    eventBus.emit("orderExecuted", trade_type);
  }

  function now() {
    return new Date().getTime();
  }

  function writeReport(is_progress, blink_off, symbol) {
    if (!symbol) symbol = so.symbols[0];
    //console.log('\nwriteReport', is_progress, so.mode)

    if (so.mode === "sim" && !so.verbose) {
      return;
    }
    readline.clearLine(process.stdout);
    readline.cursorTo(process.stdout, 0);
    //  console.log('writereport', JSON.stringify(s.symbols[symbol.product_id].period))
    // console.log('symbol', symbol)
    process.stdout.write(
      ("   " +
        moment(s.symbols[symbol.product_id].period.latest_trade_time).format(
          "MM-DD HH:mm:ss"
        ))[is_progress && !blink_off ? "bgBlue" : "cyan"]
    );
    process.stdout.write(
      z(16, symbol.symbol ? symbol.symbol : symbol.product_id, " ").green
    );
    process.stdout.write(
      "        " +
        formatCurrency(
          s.symbols[symbol.product_id].period.close,
          symbol.currency,
          true,
          true,
          true
        )
    );
    if (s.strategy.onReport) {
      let cols = s.strategy.onReport(s.symbols[symbol.product_id]);
      cols.forEach(function (col) {
        process.stdout.write(col);
      });
    }
    if (s.symbols[symbol.product_id].buy_order) {
      process.stdout.write(z(9, "buying", " ").green);
    } else if (s.symbols[symbol.product_id].sell_order) {
      process.stdout.write(z(9, "selling", " ").red);
    } else if (s.symbols[symbol.product_id].action) {
      process.stdout.write(
        z(16, s.symbols[symbol.product_id].action, " ")[
          s.symbols[symbol.product_id].action === "bought" ? "green" : "red"
        ]
      );
    } else if (s.symbols[symbol.product_id].signal) {
      process.stdout.write(
        z(16, s.symbols[symbol.product_id].signal || "", " ")[
          s.symbols[symbol.product_id].signal
            ? s.symbols[symbol.product_id].signal === "buy"
              ? "green"
              : "red"
            : "cyan"
        ]
      );
    } else if (
      s.symbols[symbol.product_id].last_trade_worth &&
      !s.symbols[symbol.product_id].buy_order &&
      !s.symbols[symbol.product_id].sell_order
    ) {
      process.stdout.write(
        z(
          16,
          formatPercent(s.symbols[symbol.product_id].last_trade_worth),
          " "
        )[s.symbols[symbol.product_id].last_trade_worth > 0 ? "green" : "red"]
      );
    } else {
      process.stdout.write(z(16, "", " "));
    }
    let start_price = s.symbols[symbol.product_id].start_price;
    if (start_price) {
      if (!s.options.future) {
        process.stdout.write(
          z(16, n(s.symbols[symbol.product_id].usdtProfit).format("0.00"), " ")[
            (s.symbols[symbol.product_id].usdtProfit || 0) >= 0
              ? "green"
              : "red"
          ]
        );
        if (s.symbols[symbol.product_id].last_trade_worth) {
          process.stdout.write(
            z(
              16,
              s.symbols[symbol.product_id].last_trade_worth
                ? formatPercent(s.symbols[symbol.product_id].last_trade_worth)
                : " ",
              " "
            )[
              s.symbols[symbol.product_id].last_trade_worth >= 0
                ? "green"
                : "red"
            ]
          );
          process.stdout.write(
            z(
              16,
              s.symbols[symbol.product_id].profit_stop_high
                ? formatPercent(s.symbols[symbol.product_id].profit_stop_high)
                : " ",
              " "
            )
          );
          process.stdout.write(
            z(
              16,
              s.symbols[symbol.product_id].profit_stop
                ? formatPercent(s.symbols[symbol.product_id].profit_stop)
                : " ",
              " "
            )
          );
        }
      } else {
        process.stdout.write(
          z(16, n(s.symbols[symbol.product_id].usdtProfit).format("0.00"), " ")[
            (s.symbols[symbol.product_id].usdtProfit || 0) >= 0
              ? "green"
              : "red"
          ]
        );
        if (s.symbols[symbol.product_id].last_trade_worth) {
          process.stdout.write(
            z(
              16,
              s.symbols[symbol.product_id].last_trade_worth
                ? formatPercent(s.symbols[symbol.product_id].last_trade_worth)
                : " ",
              " "
            )[
              s.symbols[symbol.product_id].last_trade_worth >= 0
                ? "green"
                : "red"
            ]
          );
          process.stdout.write(
            z(
              16,
              s.symbols[symbol.product_id].profit_stop_high
                ? formatPercent(s.symbols[symbol.product_id].profit_stop_high)
                : " ",
              " "
            )
          );
          process.stdout.write(
            z(
              16,
              s.symbols[symbol.product_id].profit_stop
                ? formatPercent(s.symbols[symbol.product_id].profit_stop)
                : " ",
              " "
            )
          );
        }
      }
    }
    console.log(" - ");
    if (!is_progress) {
      process.stdout.write("\n");
    }
  }
  function refreshBotData() {
    let botData = {
      tradeListLen: 0,
      tradeNum: 0,
      dynamicUsdtProfit: 0,
      dynamicProfit: 0,
      usdtProfit: 0,
      profit: 0,
      win: 0,
      lost: 0,
      winLostRate: 0,
    };
    botData.startCapital = s.balance.start_capital || 0;
    botData.currentCapital = s.balance.currency || 0;
    botData.totalCapital = botData.currentCapital;
    Object.keys(s.symbols).map((key) => {
      let pair = s.symbols[key];
      botData.tradeNum += pair.my_trades.length;
      if (pair.my_trades.length) botData.tradeListLen++;
      botData.dynamicUsdtProfit += pair.dynamicUsdtProfit || 0;
      botData.usdtProfit += pair.usdtProfit || 0;
      botData.win += pair.win || 0;
      botData.lost += pair.lost || 0;
      if (!so.future && pair.period) {
        botData.totalCapital += n(pair.asset_amount)
          .multiply(pair.period.close)
          .value();
      }
    });
    if (so.future) {
      botData.totalCapital =
        botData.startCapital + botData.usdtProfit + botData.dynamicUsdtProfit;
    }
    botData.profit = botData.usdtProfit / botData.startCapital;
    botData.dynamicProfit = botData.dynamicUsdtProfit / botData.startCapital;
    botData.winLostRate =
      botData.win + botData.lost > 0
        ? botData.win / (botData.win + botData.lost)
        : 0;
    Object.assign(s.status, botData);
    if (so.symbols.length > 1) {
      writeTotalReport();
    }
  }
  function writeTotalReport() {
    if (so.mode === "sim" && !so.verbose) {
      return;
    }
    readline.clearLine(process.stdout);
    readline.cursorTo(process.stdout, 0);

    process.stdout.write(
      moment(new Date().getTime()).format("MM-DD HH:mm:ss")["bgBlue"]
    );
    process.stdout.write(z(15, s.exchange.name, " ").green);
    process.stdout.write(z(10, s.options.period, " ").green);
    process.stdout.write(z(16, s.options.strategy.name, " ").green);
    process.stdout.write(
      z(10, s.status.tradeListLen + "/" + so.symbols.length, " ").green
    );
    process.stdout.write(z(10, n(s.status.startCapital).format("0.0"), " "));
    process.stdout.write(
      z(10, n(s.status.usdtProfit).format("0.00"), " ")[
        s.status.usdtProfit > 0 ? "green" : "red"
      ]
    );
    process.stdout.write(
      z(10, formatPercent(s.status.profit), " ")[
        s.status.profit >= 0 ? "green" : "red"
      ]
    );
    process.stdout.write(
      z(10, n(s.status.dynamicUsdtProfit).format("0.00"), " ")[
        s.status.dynamicUsdtProfit >= 0 ? "green" : "red"
      ]
    );

    /* if (!is_progress) {
      process.stdout.write('\n')
    } */
  }

  function cancelOrder(order, type, do_reorder, cb, symbol) {
    if (!symbol) symbol = so.symbols[0];
    // logger.info('start cancel order...' + JSON.stringify({ order_id: order.order_id, product_id: symbol.product_id }))
    s.exchange.cancelOrder(
      { order_id: order.order_id, product_id: symbol.product_id },
      function (body, err) {
        if (err) {
          logger.warn(
            symbol.product_id + " cancelOrder error",
            JSON.stringify(err)
          );
          return;
        }
        logger.debug(
          symbol.product_id + " cancelOrder ok",
          JSON.stringify({
            order_id: order.order_id,
            product_id: symbol.product_id,
          }),
          " results ",
          JSON.stringify(body || "")
        );
        function checkHold(do_reorder, cb) {
          s.exchange.getOrder(
            { order_id: order.order_id, product_id: symbol.product_id },
            function (err, api_order) {
              // console.log(' cancel order ok ...', s.exchange, api_order)
              logger.debug("getCancelOrder", JSON.stringify(api_order));
              if (api_order) {
                if (api_order.status === "done") {
                  order.time = new Date(api_order.done_at).getTime();
                  order.price = api_order.price || order.price; // Use actual price if possible. In market order the actual price (api_order.price) could be very different from trade price
                  logger.debug(
                    "order done," + JSON.stringify(api_order, null, 2)
                  );
                  executeOrder(order, type, symbol);
                  return syncBalance(function () {
                    cb(null, order);
                  }, symbol);
                }
                s.symbols[symbol.product_id].api_order = api_order;
                if (api_order.filled_size) {
                  order.remaining_size = n(order.size)
                    .subtract(api_order.filled_size)
                    .format(
                      s.symbols[symbol.product_id].asset_increment
                        ? s.symbols[symbol.product_id].asset_increment
                        : so.price_format
                    );
                }
              }
              syncBalance(function () {
                let on_hold;
                if (!s.options.future) {
                  if (type === "buy")
                    on_hold =
                      n(s.balance.currency)
                        .subtract(s.balance.currency_hold || 0)
                        .value() <
                      n(order.price).multiply(order.remaining_size).value();
                  else
                    on_hold =
                      n(s.symbols[symbol.product_id].asset_amount)
                        .subtract(
                          s.symbols[symbol.product_id].asset_amount_hold || 0
                        )
                        .value() < n(order.remaining_size).value();
                }
                logger.debug("on_hold", type, on_hold);
                if (on_hold && s.balance.currency_hold > 0) {
                  // wait a bit for settlement
                  logger.warn(
                    symbol.product_id +
                      " funds on hold after cancel, waiting 5s"
                  );
                  setTimeout(function () {
                    checkHold(do_reorder, cb);
                  }, conf.wait_for_settlement);
                } else {
                  cb(null, do_reorder ? null : false);
                }
              }, symbol);
            }
          );
        }
        checkHold(do_reorder, cb);
      }
    );
  }
  function checkOrder(order, type, cb, symbol) {
    if (!symbol) symbol = so.symbols[0];
    if (!s.symbols[symbol.product_id][type + "_order"]) {
      // signal switched, stop checking order
      logger.warn("signal switched during " + type + ", aborting");
      return cancelOrder(order, type, false, cb, symbol);
    }
    if (
      s.options.max_check_order_num &&
      order.checkNum &&
      order.checkNum > s.options.max_check_order_num
    ) {
      logger.warn(
        "order checknum > " + s.options.max_check_order_num + ", aborting"
      );
      return cancelOrder(order, type, false, cb, symbol);
    }
    s.exchange.getOrder(
      { order_id: order.order_id, product_id: symbol.product_id },
      function (err, api_order) {
        if (err) return cb(err);
        s.symbols[symbol.product_id].api_order = api_order;
        order.status = api_order.status;
        order.checkNum = !order.checkNum ? 1 : order.checkNum + 1;
        // console.log('order.checkNum', s.options.max_check_order_num, order.checkNum)
        if (api_order.reject_reason)
          order.reject_reason = api_order.reject_reason;
        if (api_order.status === "done") {
          order.time = new Date(api_order.done_at).getTime();
          order.price = api_order.price || order.price; // Use actual price if possible. In market order the actual price (api_order.price) could be very different from trade price
          logger.debug("order done " + JSON.stringify(api_order));
          executeOrder(order, type, symbol);
          return syncBalance(function () {
            cb(null, order);
          }, symbol);
        }
        logger.error("order not done," + JSON.stringify(order, null, 2));
        if (
          order.status === "rejected" &&
          (order.reject_reason === "post only" ||
            api_order.reject_reason === "post only")
        ) {
          logger.warn("post-only " + type + " failed, re-ordering");
          return cb(null, null);
        }
        if (order.status === "rejected" && order.reject_reason === "balance") {
          logger.warn(
            "not enough balance for " + type + " " + symbol.product_id,
            ", aborting"
          );
          return cb(null, null);
        }
        if (now() - order.local_time >= so.order_adjust_time) {
          getQuote(function (err, quote) {
            if (err) {
              err.desc = "could not execute " + type + ": error fetching quote";
              logger.warn(
                "could not execute " + type + ": error fetching quote"
              );
              return cb(err);
            }
            let marked_price;
            if (type === "buy") {
              marked_price = nextBuyForQuote(s, quote, symbol);
              if (
                so.exact_buy_orders &&
                n(order.price).value() != marked_price
              ) {
                logger.warn(
                  symbol.product_id +
                    " " +
                    type +
                    " " +
                    marked_price +
                    " exact vs! our " +
                    order.price
                );
                cancelOrder(order, type, true, cb, symbol);
              } else if (n(order.price).value() < marked_price) {
                logger.warn(
                  symbol.product_id +
                    " " +
                    type +
                    " " +
                    marked_price +
                    " vs our " +
                    order.price
                );
                cancelOrder(order, type, true, cb, symbol);
              } else {
                order.local_time = now();
                setTimeout(function () {
                  checkOrder(order, type, cb, symbol);
                }, so.order_poll_time);
              }
            } else {
              marked_price = nextSellForQuote(s, quote, symbol);
              if (
                so.exact_sell_orders &&
                n(order.price).value() != marked_price
              ) {
                logger.warn(
                  symbol.product_id +
                    " " +
                    type +
                    " " +
                    marked_price +
                    " exact vs our " +
                    order.price
                );
                cancelOrder(order, type, true, cb, symbol);
              } else if (n(order.price).value() > marked_price) {
                logger.warn(
                  symbol.product_id +
                    " " +
                    type +
                    " " +
                    marked_price +
                    " vs our " +
                    order.price
                );
                cancelOrder(order, type, true, cb, symbol);
              } else {
                order.local_time = now();
                setTimeout(function () {
                  checkOrder(order, type, cb, symbol);
                }, so.order_poll_time);
              }
            }
          }, symbol);
        } else {
          setTimeout(function () {
            checkOrder(order, type, cb, symbol);
          }, so.order_poll_time);
        }
      }
    );
  }

  var klineProcessingQueue = async.queue(function (
    { symbol, kline, is_preroll },
    callback
  ) {
    //  console.log('klineProcessingQueue..', { kline, is_preroll })
    onKLine(symbol, kline, is_preroll, callback);
  });

  function queueKLine(symbol, kline, is_preroll) {
    klineProcessingQueue.push({ symbol, kline, is_preroll });
  }
  function initKLinePeriod(symbol, trade) {
    // s.symbols[symbol.product_id].period = Object.assign({}, kline)
    if (!symbol) symbol = so.symbols[0];
    //  console.log('trade', trade)
    if (trade.isTrade) {
      trade.period_id = tb(trade.time)
        .resize(s.symbols[symbol.product_id]._period)
        .toString();
      /* console.log(
        "\nget trade".cyan,
        s.symbols[symbol.product_id].period,
        s.symbols[symbol.product_id].period.close_time,
        moment(s.symbols[symbol.product_id].period.close_time).format(
          "MMDD HH:mm:ss"
        ).green,
        s.symbols[symbol.product_id]._period,
        trade.period_id.cyan,
        moment(trade.time).format("MMDD HH:mm:ss").green
      ); */
      const inPeriod =
        s.symbols[symbol.product_id].period &&
        trade.period_id === s.symbols[symbol.product_id].period.period_id;
      if (inPeriod) {
        // console.log('inPeriod', trade.period_id, s.symbols[symbol.product_id].period && s.symbols[symbol.product_id].period.period_id, inPeriod)
        // Object.assign(s.symbols[symbol.product_id].period, kline)
        s.symbols[symbol.product_id].period.high = Math.max(
          trade.close,
          s.symbols[symbol.product_id].period.high
        );
        s.symbols[symbol.product_id].period.low = Math.min(
          trade.close,
          s.symbols[symbol.product_id].period.low
        );
        s.symbols[symbol.product_id].period.close = trade.close;
        s.symbols[symbol.product_id].period.volume = trade.size;
      } else {
        //new kline
        let d = tb(trade.time).resize(s.symbols[symbol.product_id]._period);
        let de = tb(trade.time)
          .resize(s.symbols[symbol.product_id]._period)
          .add(1);
        s.symbols[symbol.product_id].period = {
          period_id: d.toString(),
          size: s.symbols[symbol.product_id]._period,
          time: d.toMilliseconds(),
          open: trade.close,
          high: trade.close,
          low: trade.close,
          close: trade.close,
          volume: trade.size,
          close_time: de.toMilliseconds() - 1,
          closeStr: moment(de.toMilliseconds() - 1).format("YYYYMMDDHHMM"),
        };
        // console.log('initKLinePeriod', symbol.product_id, moment(s.symbols[symbol.product_id].period.latest_trade_time).format('HHMMSS'), s.symbols[symbol.product_id].period.close)
        s.symbols[symbol.product_id].lookback.unshift(
          s.symbols[symbol.product_id].period
        );
      }
      s.symbols[symbol.product_id].period.latest_trade_time = trade.time;
    } else {
      //replace kline
      s.symbols[symbol.product_id].period = trade;
      s.symbols[symbol.product_id].lookback.unshift(
        s.symbols[symbol.product_id].period
      );
    }
    if (s.options.mode !== "sim") {
      if (
        s.symbols[symbol.product_id].lookback.length >
        s.options.keep_lookback_periods
      ) {
        s.symbols[symbol.product_id].lookback.pop();
      }
    }
  }
  function updateKLinePeriod(symbol, kline, in_preroll) {
    initKLinePeriod(symbol, kline);
    s.strategy.calculate(s.symbols[symbol.product_id], s.options);
  }
  function onKLine(symbol, kline, is_preroll, cb) {
    /*  if (!is_preroll) {
       console.log('onKLine', kline.time, s.symbols[symbol.product_id].period.time)
     } */
    /* if (s.symbols[symbol.product_id].period && kline.time < s.symbols[symbol.product_id].period.time) {
      return cb()
    } */
    if (!s.symbols[symbol.product_id].period) {
      if (!s.symbols[symbol.product_id].init_price) {
        s.symbols[symbol.product_id].init_price = kline.close;
      }
      // console.log('s.symbols[symbol.product_id].init_price', s.symbols[symbol.product_id].init_price, kline)
    }
    s.symbols[symbol.product_id].in_preroll = is_preroll;
    // console.log('onKLine', s.symbols[symbol.product_id].in_preroll)
    if (s.symbols[symbol.product_id].in_preroll) {
      //preload
      updateKLinePeriod(symbol, kline, s.symbols[symbol.product_id].in_preroll);
      if (_.isFunction(cb)) cb();
    } else {
      //realtime load
      withOnKLinePeriod(symbol, kline, cb);
    }
  }
  function initClock(kline) {
    if (so.mode === "sim") {
      clock = lolex.install({ shouldAdvanceTime: false, now: kline.time });
      // console.log('clock', clock)
    }
    return 1;
  }
  function withOnKLinePeriod(symbol, kline, cb) {
    if (!clock && so.mode === "sim") {
      clock = lolex.install({ shouldAdvanceTime: false, now: kline.time });
      // console.log('clock', clock)
    }
    updateKLinePeriod(symbol, kline);
    s.strategy.onPeriod(s.symbols[symbol.product_id], function () {
      if (debug.on || so.symbols.length === 1) {
        writeReport(true, false, symbol);
      }
      // console.log('\nwithOnKLinePeriod', s.symbols[symbol.product_id].last_buy_price, s.symbols[symbol.product_id].last_trade_worth, s.symbols[symbol.product_id].dynamicProfit)
      if (s.symbols[symbol.product_id].last_buy_price) {
        s.symbols[symbol.product_id].dynamicProfit =
          s.symbols[symbol.product_id].last_buy_type.indexOf("short") >= 0
            ? n(s.symbols[symbol.product_id].last_buy_price)
                .subtract(s.symbols[symbol.product_id].period.close)
                .divide(s.symbols[symbol.product_id].last_buy_price)
                .value()
            : n(s.symbols[symbol.product_id].period.close)
                .subtract(s.symbols[symbol.product_id].last_buy_price)
                .divide(s.symbols[symbol.product_id].last_buy_price)
                .value();
        s.symbols[symbol.product_id].dynamicUsdtProfit = n(
          s.symbols[symbol.product_id].dynamicProfit
        )
          .multiply(s.symbols[symbol.product_id].last_buy_price)
          .multiply(s.symbols[symbol.product_id].asset_amount)
          .value();
        if (s.options.future) {
          /* logger.debug(
            "xxxx",
            s.symbols[symbol.product_id].dynamicProfit,
            s.symbols[symbol.product_id].leverage
          ); */
          s.symbols[symbol.product_id].dynamicProfit = n(
            s.symbols[symbol.product_id].dynamicProfit
          )
            .multiply(s.symbols[symbol.product_id].leverage)
            .value();
          /* console.log("xxx2"); */
          if (so.mode !== "live") {
            s.symbols[symbol.product_id].dynamicUsdtProfit = n(
              s.symbols[symbol.product_id].dynamicProfit
            )
              .multiply(s.symbols[symbol.product_id].last_buy_price)
              .multiply(s.symbols[symbol.product_id].asset_amount)
              .value();
          } else {
            s.symbols[symbol.product_id].dynamicUsdtProfit = n(
              s.symbols[symbol.product_id].dynamicProfit
            )
              .multiply(s.symbols[symbol.product_id].last_buy_price)
              .multiply(s.symbols[symbol.product_id].asset_amount)
              .divide(s.symbols[symbol.product_id].leverage)
              .value();
          }
        }
      }
      //  s.symbols[symbol.product_id].acted_on_stop = false
      if (!s.symbols[symbol.product_id].in_preroll) {
        // console.log('xx0..', s.symbols[symbol.product_id].period.close)
        if (so.trade_type !== "manual") {
          executeStop(true, symbol);
          if (clock) {
            var diff = kline.time - now();
            // Allow some catch-up if trades are too far apart. Don't want all calls happening at the same time
            while (diff > 5000) {
              clock.tick(5000);
              diff -= 5000;
            }
            clock.tick(diff);
            // console.log('clock', diff, now())
          }
          if (s.symbols[symbol.product_id].signal) {
            if (
              so.trade_type === "auto" ||
              (so.trade_type === "autoSell" &&
                s.symbols[so.symbols[0].product_id].signal === "sell") ||
              (so.trade_type === "autoBuy" &&
                s.symbols[so.symbols[0].product_id].signal === "buy")
            ) {
              let tempSignal = s.symbols[symbol.product_id].signal;
              let tempInSignal = s.symbols[symbol.product_id].inSignal;
              executeSignal(
                s.symbols[symbol.product_id].signal,
                (err) => {
                  //  console.log('exxxx.cb', str)
                  if (err) {
                    console.error((err.message + ": " + err.desc).red);
                  } else {
                    s.symbols[symbol.product_id].acted_on_stop = false;
                    //when the signal send by strategy and with buy position side when sell
                    if (
                      tempSignal === "sell" &&
                      so.market === "both" &&
                      so.buy_position_side_when_sell
                    ) {
                      if (
                        s.symbols[symbol.product_id].last_sell_type.indexOf(
                          "loss_"
                        ) >= 0 ||
                        s.symbols[symbol.product_id].last_sell_type.indexOf(
                          "manual_"
                        ) >= 0 ||
                        s.symbols[symbol.product_id].last_sell_type.indexOf(
                          "profit_"
                        ) >= 0
                      )
                        return;
                      console.log(
                        "buy_position_side_when_sell".red,
                        symbol.product_id
                      );
                      s.symbols[symbol.product_id].inBuyPositionSide = true;
                      sendAction(
                        s.symbols[symbol.product_id],
                        so.strategy.name,
                        "buy",
                        tempInSignal === "long" ? "short" : "long"
                      );
                      return;
                    }
                  }
                },
                null,
                false,
                false,
                false,
                symbol
              );
            }
          }
          s.symbols[symbol.product_id].signal = null;
        }
        /* if (so.mode !== 'live') {
          s.exchange.processTrade(kline)
        } */
      }
      //s.symbols[symbol.product_id].action = null
      s.symbols[symbol.product_id].last_period_id =
        s.symbols[symbol.product_id].period.period_id;
      if (_.isFunction(cb)) cb();
    });
    // cb()
  }
  function onKLines(symbol, klines, is_preroll, cb) {
    if (_.isFunction(is_preroll)) {
      cb = is_preroll;
      is_preroll = false;
    }
    var local_klines = klines.slice(0);
    var kline;
    while ((kline = local_klines.shift()) !== undefined) {
      queueKLine(symbol, kline, is_preroll);
    }
    if (_.isFunction(cb)) cb();
  }

  return {
    writeHeader: function () {
      let cols = [
        z(16, "DATE", " ").cyan,
        z(16, "SYMBOL", " ").cyan,
        z(16, "PRICE", " ").cyan,
      ];
      if (s.strategy.onReport) {
        let reportCols = s.strategy.onReport(null, true);
        cols.push(...reportCols);
      }
      cols.push(
        ...[
          z(16, "ACTIONS", " ").cyan,
          z(16, "SIGNAL", " ").cyan,
          z(16, "PROFIT", " ").cyan,
        ]
      );
      process.stdout.write(cols.join("") + "\n");
    },
    updateKLine: onKLine,
    updateKLines: onKLines,
    exit: function (cb) {
      if (core) {
        core.saveBot(true, () => {
          if (s.strategy.onExit) {
            s.strategy.onExit(s);
          }
          if (klineProcessingQueue.length()) {
            klineProcessingQueue.drain(() => {
              cb();
              return;
            });
          } else {
            cb();
            return;
          }
        });
      } else {
        if (s.strategy.onExit) {
          s.strategy.onExit(s);
        }
        if (klineProcessingQueue.length()) {
          klineProcessingQueue.drain(() => {
            cb();
            return;
          });
        } else {
          cb();
          return;
        }
      }
    },
    executeSignal: executeSignal,
    refreshBotData: refreshBotData,
    syncBalance: syncBalance,
    initSymbols: initSymbols,
    initExchange: initExchange,
    initClock: initClock,
  };
};
