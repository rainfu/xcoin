const collectionService = require("../lib/mongo-service"),
  debug = require("../lib/debug"),
  { getBacktestData } = require("../extensions/output/panacea/api/status"),
  tb = require("timebucket"),
  moment = require("moment"),
  n = require("numbro"),
  _ = require("lodash"),
  path = require("path"),
  fs = require("fs");

module.exports = function core(s, conf, engine) {
  var prev_timeout = false;
  var collectionServiceInstance = collectionService(conf);

  function newProudctsMonitor() {
    //  console.log(`conf`, conf)
    s.exchange.refreshProducts(function (products, newProducts) {
      console.log("newProudctsMonitor".green, newProducts.length);
      s.options.symbols.push(...newProducts);
      return;
    });
    return;
  }
  function saveBotLoop() {
    saveBot();
    setTimeout(function () {
      saveBotLoop();
    }, s.options.save_bot_time);
  }
  function saveBot(exit = false, cb) {
    if (!exit && !s.options.save_bot_time) return;
    if (exit) {
      s.status.endTime = new Date().getTime();
      s.status.status = "finished";
    }
    var bots = collectionServiceInstance.getBots();
    if (bots.err) {
      debug.msg("Save bot error".cyan + bots.message.red);
      if (cb) cb();
    } else {
      let bot = Object.assign(getBacktestData(s), {
        id: tb(s.status.startTime).resize(s.options.period).toString(),
        time: new Date().getTime(),
      });
      // console.log('save bot', bot.id)
      bots.replaceOne({ _id: bot.id }, bot, { upsert: true }, function (err) {
        if (err) {
          console.error(
            "\n" +
              moment().format("YYYY-MM-DD HH:mm:ss") +
              " - error saving bot"
          );
          console.error(err);
        }
        // console.log('save bot ok', s.status)
        if (cb) cb();
      });
    }
  }
  function getLastBot(cb) {
    var bots = collectionServiceInstance.getBots();
    if (bots.err) {
      debug.msg("get last bot error".cyan + bots.message.red);
      if (cb) cb();
    } else {
      bots
        .find({ "options.name": s.options.name })
        .sort({ time: -1 })
        .limit(1)
        .toArray()
        .then((botDatas) => {
          // debug.msg('botDatas'.green + " " + botDatas.length.toString().cyan + " " + JSON.stringify(botDatas, null, 2))
          if (cb) cb(botDatas && botDatas.length ? botDatas[0] : null);
        });
    }
  }
  function buy(
    cb,
    symbol,
    position_side = "LONG",
    size = null,
    is_taker = false
  ) {
    if (position_side === "SHORT") {
      s.symbols[symbol.product_id].inSignal = "short";
      s.symbols[symbol.product_id].last_buy_type = "manual_buy_short";
    } else {
      s.symbols[symbol.product_id].inSignal = "long";
      s.symbols[symbol.product_id].last_buy_type = "manual_buy_long";
    }
    debug.msg("\nstart buySymbol " + symbol.product_id + " " + position_side);

    engine.executeSignal(
      "buy",
      function () {
        debug.msg("\nbuySymbol ok");
        if (cb) cb();
      },
      size,
      false,
      is_taker,
      false,
      symbol
    );
  }
  function buyAll(cb, symbols, size = s.options.max_buy_size) {
    //TODO:should parse to json

    if (!symbols.length) {
      console.log("\nbuyAllSymbol ok".bgGreen);
      if (cb) cb();
      return;
    }
    // console.log('buyAllSymbols', symbols)
    let symbol = symbols.pop();
    let isShort =
      s.symbols[symbol.product_id].positionSide &&
      s.symbols[symbol.product_id].positionSide === "SHORT";

    buy(
      () => {
        setTimeout(function () {
          buyAll(cb, symbols);
        }, 500);
      },
      symbol,
      isShort ? "SHORT" : "LONG",
      size
    );
  }
  function sellAll(cb, symbols) {
    if (!symbols.length) {
      console.log("sellSymbols ok".bgGreen);
      if (cb) cb();
      return;
    }
    let symbol = symbols.pop();
    let isShort =
      s.symbols[symbol.product_id] &&
      s.symbols[symbol.product_id].positionSide === "SHORT";
    // console.log('s.symbols[symbol.product_id]', isShort)
    sell(
      function () {
        setTimeout(function () {
          sellAll(cb, symbols);
        }, 500);
      },
      symbol,
      isShort ? "SHORT" : "LONG"
    );
  }
  function sell(
    cb,
    symbol,
    position_side = "LONG",
    size = null,
    is_taker = false,
    is_part = false
  ) {
    if (position_side === "SHORT") {
      s.symbols[symbol.product_id].inSignal = "short";
      s.symbols[symbol.product_id].last_sell_type = "manual_sell_short";
    } else {
      s.symbols[symbol.product_id].inSignal = "long";
      s.symbols[symbol.product_id].last_sell_type = "manual_sell_long";
    }
    if (is_part) {
      s.symbols[symbol.product_id].last_sell_type =
        "manual_sell_" + (position_side === "short" ? "short" : "long");
    }
    console.log(
      "start sellSymbol".bgGreen,
      symbol.product_id,
      position_side,
      size,
      is_part
    );

    engine.executeSignal(
      "sell",
      function () {
        console.log("sellSymbol ok".bgGreen);
        if (cb) cb();
      },
      size,
      false,
      is_taker,
      false,
      symbol
    );
  }
  function getInitKLines(cb, symbols, inOpts) {
    if (!symbols.length) {
      debug.msg("get all init klines ok");
      cb();
      return;
    }
    let symbol = symbols.shift();
    getInitKLine(cb, symbols, symbol, inOpts);
  }
  function getInitKLine(cb, symbols, symbol, inOpts = { limit: 1000 }) {
    // console.log('s.symbols[symbol.product_id]', s.symbols[symbol.product_id])
    var query_start = tb()
      .resize(s.symbols[symbol.product_id]._period)
      .subtract(inOpts.limit)
      .toMilliseconds();
    var opts = {
      product_id: symbol.product_id,
      period: s.symbols[symbol.product_id]._period,
      from: query_start,
      limit: inOpts.limit + 1,
    };
    console.log(
      symbol.normalized.green,
      "fetching pre-roll klines".cyan,
      s.symbols[symbol.product_id]._period,
      " start".cyan,
      moment(query_start).format("YYYYMMDDHHMM").green,
      " limit".cyan,
      inOpts.limit
    );
    s.exchange.getKLines(opts, function (err, klines) {
      if (err) {
        if (
          err.code === "ETIMEDOUT" ||
          err.code === "ENOTFOUND" ||
          err.code === "ECONNRESET"
        ) {
          if (prev_timeout) {
            console.error(
              "\n" +
                moment().format("YYYY-MM-DD HH:mm:ss") +
                " - getKLines request timed out. retrying..."
            );
          }
          prev_timeout = true;
        } else if (err.code === "HTTP_STATUS") {
          if (prev_timeout) {
            console.error(
              "\n" +
                moment().format("YYYY-MM-DD HH:mm:ss") +
                " - getKLines request failed: " +
                err.message +
                ". retrying..."
            );
          }
          prev_timeout = true;
        } else {
          console.error(
            "\n" +
              moment().format("YYYY-MM-DD HH:mm:ss") +
              " - getKLines request failed. retrying..."
          );
          console.error(err);
        }
        return;
      }
      engine.updateKLines(symbol, klines, true, function (err) {
        console.log(
          symbol.symbol ? symbol.symbol : symbol.product_id.green,
          "fetching pre-roll klines ok".cyan,
          s.symbols[symbol.product_id]._period.green,
          (
            "..." +
            (s.exchange.getProducts().length - symbols.length) +
            "/" +
            s.exchange.getProducts().length
          ).cyan,
          (klines.length + "").green
        );
        // console.log('updateKLines symbol.product_id', klines.length, s.symbols[symbol.product_id].lookback.length)
        if (err) throw err;
        engine.syncBalance(function (err) {
          //  console.log('syncBalance', symbol.product_id)
          if (err) {
            if (err.desc) console.error(err.desc);
            if (err.body) console.error(err.body);
            throw err;
          }
          setTimeout(() => {
            /* console.log('klines', klines.map(kline => {
                            return { id: kline.period_id, show: moment(kline.time).format('MMDD HH:mm:ss'), show2: moment(kline.close_time).format('MMDD HH:mm:ss') }
                        })) */
            /*  console.log('lookback', s.symbols[symbol.product_id].lookback.map(kline => {
                             return { id: kline.period_id, show: moment(kline.time).format('MMDD HH:mm:ss'), show2: moment(kline.close_time).format('MMDD HH:mm:ss') }
                         })) */
            /* console.log(
              "get kline last period".cyan,
              symbol.product_id,
              s.symbols[symbol.product_id].lookback[0].period_id.cyan,
              moment(s.symbols[symbol.product_id].lookback[0].time).format(
                "MMDD HH:mm:ss"
              ).green,
              moment(
                s.symbols[symbol.product_id].lookback[0].close_time
              ).format("MMDD HH:mm:ss").green
            ); */
            getInitKLines(cb, symbols, inOpts);
          }, s.options.poll_init_klines);
        }, symbol);
      });
    });
  }
  function getExchangeHotSymbols(
    options = {
      number: 10,
      limit: 10,
      period: "1d",
    },
    cb,
    client = null
  ) {
    let hlArray = [];
    let data = {};
    let totalP = 1000;
    let getAliveSymbols = (products) => {
      if (!products.length) {
        console.log("getExchangeHotSymbols ok");
        data.time = new Date().getTime();
        data.maxSum = hlArray
          .sort((a, b) => {
            return b.sum - a.sum;
          })
          .slice(0, options.number)
          .map((h, index) => {
            return {
              index: index + 1,
              name: h.symbol,
              price: h.price,
              extra: n(h.sum).format("0.00%"),
              lines: h.dataList,
              markers: [],
            };
          });
        data.minSum = hlArray
          .sort((a, b) => {
            return a.sum - b.sum;
          })
          .slice(0, options.number)
          .map((h, index) => {
            return {
              index: index + 1,
              name: h.symbol,
              price: h.price,
              extra: n(h.sum).format("0.00%"),
              lines: h.dataList,
              markers: [],
            };
          });
        data.fastUp = hlArray
          .sort((a, b) => {
            return b.change - a.change;
          })
          .slice(0, options.number)
          .map((h, index) => {
            return {
              index: index + 1,
              name: h.symbol,
              price: h.price,
              extra: n(h.change).format("0.00%"),
              lines: h.dataList,
              markers: [],
            };
          });
        data.moreUp = hlArray
          .sort((a, b) => {
            return b.upCount - a.upCount;
          })
          .slice(0, options.number)
          .map((h, index) => {
            return {
              index: index + 1,
              name: h.symbol,
              price: h.price,
              extra: h.upCount + "/" + options.limit,
              lines: h.dataList,
              markers: [],
            };
          });
        data.continueUp = hlArray
          .sort((a, b) => {
            return b.continueUpCount - a.continueUpCount;
          })
          .slice(0, options.number)
          .map((h, index) => {
            return {
              index: index + 1,
              name: h.symbol,
              price: h.price,
              extra: h.continueUpCount,
              lines: h.dataList,
              markers: [],
            };
          });
        if (cb) cb(data);
        return;
      }
      let p = products.pop();
      var opts = {
        product_id: p.asset + "-" + p.currency,
        period: options.period,
        limit: options.limit,
        from: tb()
          .resize(options.period)
          .subtract(options.limit)
          .toMilliseconds(),
      };
      s.exchange.getKLines(opts, function (err, klines) {
        if (err) {
          console.log("error", err);
          getAliveSymbols(products);
          return;
        }
        let sum = 0,
          change = 0,
          dataList = [],
          perChange = 0,
          last_change = 0,
          upCount = 0,
          continueUpCount = 0,
          init_price = 0,
          last_price = 0;
        klines.forEach((k) => {
          if (!init_price) init_price = k.open;
          var hl = (k.high - k.low) / k.open;
          change = (k.close - init_price) / init_price;
          perChange = (k.close - k.open) / k.open;
          sum += hl;
          if (perChange > 0) {
            upCount++;
            continueUpCount++;
          } else {
            continueUpCount = 0;
          }
          last_change = perChange;
          dataList.push({
            time: k.time,
            value: k.close,
          });
          last_price = k.close;
          // console.log(opts.product_id, ' getkline ', k.close, last_close, k.open, last_close || k.open, (new Date(k.time)).toLocaleDateString(), k.close, change, sum, upCount, continueUpCount)
        });
        if (last_change <= 0) {
          continueUpCount = 0;
        }
        let a = {
          id: p.id,
          symbol: opts.product_id,
          sum,
          change,
          upCount,
          continueUpCount,
          price: last_price,
          dataList,
        };
        hlArray.push(a);
        console.log(
          "getExchangeHotSymbols finished " +
            (totalP - products.length) +
            "/" +
            totalP
        );
        console.log(
          "%s %s ,trend:%s,sum:%s,up:%s,cup:%s",
          opts.product_id,
          options.limit,
          a.sum,
          a.change,
          a.upCount,
          a.continueUpCount
        );
        if (client) {
          let data = {
            action: "watchProcess",
            data: {
              finished: totalP - products.length,
              total: totalP,
            },
          };
          client.server.reply(client.ws, data);
        }
        setTimeout(() => {
          getAliveSymbols(products);
        }, s.options.poll_scan_time);
      });
    };
    let initProducts = _.defaultsDeep(s.exchange.getProducts())
      .filter((f) => {
        return f.currency === "USDT" && f.asset.indexOf("USD") < 0;
      })
      .slice(0, totalP);
    totalP = initProducts.length;
    getAliveSymbols(initProducts);
  }
  function getStrategies() {
    let strategies = [];
    try {
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
      strategies = strategies.sort((a, b) => a.order - b.order);
    } catch (err) {
      console.log("error get strategies", err);
      process.exit(1);
    }
    console.log("strategiesstrategiesstrategies", strategies);
    return strategies;
  }
  function getExchangeProducts(
    exchanges = "all",
    type = "USDT",
    detail = false
  ) {
    if (exchanges === "all") {
      exchanges = fs.readdirSync("./extensions/exchanges");
    } else {
      exchanges = exchanges.split(",");
    }
    // console.log('exchanges', exchanges)
    let data = exchanges
      .filter((e) => e !== "sim")
      .map(function (exchange) {
        let ex = {
          name: exchange,
          type,
        };
        var products = require(`../data/exchanges/${exchange}_products.json`);
        products.sort(function (a, b) {
          if (a.asset < b.asset) return -1;
          if (a.asset > b.asset) return 1;
          if (a.currency < b.currency) return -1;
          if (a.currency > b.currency) return 1;
          return 0;
        });
        ex.productLen = products.length;
        if (type) {
          products = products.filter((p) => p.currency === type);
          ex.typeLen = products.length;
        }
        if (detail === "label") {
          ex.products = products
            .map((p) => p.asset + "-" + p.currency)
            .join(",");
        } else if (detail === "detail") {
          ex.products = products;
        }
        return ex;
      });
    // console.log('data', data)
    return data;
  }

  /* if (so.monitor) {
        setInterval(newProudctsMonitor, 3600000)
        setTimeout(newProudctsMonitor, 600000)
    } */
  return {
    getLastBot,
    saveBot,
    saveBotLoop,
    getInitKLine,
    getInitKLines,
    newProudctsMonitor,
    buy,
    buyAll,
    sell,
    sellAll,
    getExchangeHotSymbols,
    getStrategies,
    getExchangeProducts,
  };
};
