var tb = require("timebucket"),
  minimist = require("minimist"),
  path = require("path"),
  moment = require("moment"),
  colors = require("colors"),
  _ = require("lodash"),
  helpers = require("../lib/helpers"),
  engineFactory = require("../lib/engine"),
  collectionService = require("../lib/mongo-service"),
  { getBacktestData } = require("../extensions/output/panacea/api/status"),
  crypto = require("crypto");

module.exports = function (program, conf) {
  program
    .command("sim [exchange]")
    .allowUnknownOption()
    .description("run a simulation on backfilled data")
    .option("--conf <path>", "path to optional conf overrides file")
    .option("--strategy <name>", "strategy to use", String, conf.strategy)
    .option("--start <datetime>", 'start ("YYYYMMDDHHmm")')
    .option("--end <datetime>", 'end ("YYYYMMDDHHmm")')
    .option("--bot <bid>", "sim with bot backtest")
    .option(
      "--watch_symbols <watch_symbols>",
      "init symbols in trade",
      String,
      conf.watch_symbols
    )
    .option("--proxy <proxy>", "use proxy", String, conf.proxy)
    .option("--debug", "output detailed debug info")
    .action(function (exchange) {
      var s = {
        options: minimist(process.argv),
        symbols: {},
        status: {
          tradeListLen: 0,
          startCapital: 0,
          currentCapital: 0,
          tradeNum: 0,
          dynamicUsdtProfit: 0,
          dynamicProfit: 0,
          usdtProfit: 0,
          profit: 0,
        },
      };
      var logger = conf.logger;
      var so = s.options;
      // init bot options don't send this params to client
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
      delete so.symbols;
      so.mode = "sim";
      s.balance = {
        start_capital: so.currency_capital,
        currency: so.currency_capital,
        currency_hold: 0,
      };
      so.exchange = exchange;
      let symbolsIds = so.watch_symbols.split(",");
      so.symbols = symbolsIds.map((symbol) => {
        return helpers.objectifySelector(symbol);
      });
      if (so.start) {
        so.start = moment(so.start, "YYYYMMDDHHmm").valueOf();
      } else {
        so.start = tb()
          .resize(so.period)
          .subtract(so.min_periods)
          .toMilliseconds();
      }
      if (so.end) {
        so.end = moment(so.end, "YYYYMMDDHHmm").valueOf();
      } else {
        so.end = moment().valueOf();
      }
      var tickerCollection = collectionService(conf).getTickers();
      var simCollection = collectionService(conf).getSims();
      var cursor;
      var totalCount = 0;
      var clockNow = null;
      var query_start = so.start
        ? tb(so.start)
            .resize(so.period)
            .subtract(so.min_periods)
            .toMilliseconds()
        : null;
      var engine;
      initBotData(() => {
        engine = engineFactory(s, conf);
        writeHead();
        run();
      });
      /**
       * start the main bot loop
       */
      function run() {
        //init symbols
        engine.initSymbols(so.symbols);
        logger.debug("Init exchanges symbols ok".cyan + " " + so.watch_symbols);
        //sim symbols
        s.status.status = "ready";
        simSymbolAll(so.symbols.slice(0), () => {
          engine.exit(() => {
            saveSim(so.bot, (res) => {
              logger.debug(
                "Save sim ok with Id".cyan +
                  " " +
                  res.id +
                  " " +
                  JSON.stringify(res.status, null, 2)
              );
              logger.info(
                "Save sim result ok with bot:".green +
                  (so.bot || -1).toString().cyan
              );
              setTimeout(() => {
                //timer to save logs
                process.exit(0);
              }, 2000);
            });
          });
        });
      }
      /**
       * write head message on screeen
       */
      function writeHead() {
        var head =
          "\n\n------------------------------------------ " +
          " STARTING " +
          so.mode.toUpperCase() +
          " TRADING " +
          " ------------------------------------------";
        logger.info(head);
        logger.info(
          "Sim".cyan +
            " " +
            so.period.green +
            " " +
            moment(query_start).format("MM-DD HH:mm:ss").yellow +
            " " +
            moment(so.start).format("MM-DD HH:mm:ss").yellow +
            " " +
            moment(so.end).format("MMDD HH:mm:ss").yellow
        );
        if (so.proxy) {
          logger.debug("!!! Use Proxy:" + so.proxy);
        }
      }
      function initBotData(cb) {
        if (so.bot) {
          getBots(so.bot, (botDatas) => {
            if (!botDatas.length) {
              console.log(
                "Sorry,can't find bot with id:".green,
                so.bot.toString().cyan
              );
              process.exit(0);
              return;
            }
            /* botCollection.find({}).count().then((botLen) => {
              console.log('All bots count is'.green, botLen)
            }) */
            // console.log('botDatas', botDatas)
            let botData = botDatas[0];
            console.log(
              "Get bot with id".green,
              so.bot.toString().cyan,
              " Ok".green
            );
            Object.keys(botData.options).forEach(function (k) {
              so[k] = botData.options[k];
            });
            if (so.sim_options) {
              Object.keys(so.sim_options).forEach(function (k) {
                so[k] = so.sim_options[k];
              });
            }
            so.start = botData.status.startTime;
            so.end =
              botData.status.endTime || botData.time || new Date().getTime();
            query_start = tb(so.start)
              .resize(so.period)
              .subtract(so.min_periods)
              .toMilliseconds();
            if (cb) cb();
          });
        } else {
          cb();
        }
      }

      function simSymbolAll(symbols, cb) {
        if (!symbols.length) {
          logger.debug(
            "All ".green +
              ("" + so.symbols.length).yellow +
              " Symbols sim ok".cyan
          );
          if (cb) cb();
          return;
        }
        let symbol = symbols.pop();
        simSymbol(symbol, () => {
          simSymbolAll(symbols, cb);
        });
      }
      function simSymbol(symbol, cb) {
        getNext(symbol, () => {
          if (cb) cb();
        });
      }
      function getNext(symbol, cb) {
        var opts = {
          query: { selector: symbol.normalized },
          sort: { time: 1 },
          limit: 1000,
          timeout: false,
        };
        if (so.end) {
          opts.query.time = { $lte: so.end };
        }
        if (cursor) {
          if (!opts.query.time) opts.query.time = {};
          opts.query.time["$gt"] = cursor;
        } else if (query_start) {
          if (!opts.query.time) opts.query.time = {};
          opts.query.time["$gte"] = query_start;
        }
        logger.debug(
          symbol.product_id.green +
            " get ticker opts".cyan +
            " " +
            JSON.stringify(opts)
        );
        var collectionCursor = tickerCollection
          .find(opts.query)
          .sort(opts.sort)
          .limit(opts.limit);
        tickerCollection
          .find(opts.query)
          .count()
          .then((count) => {
            logger.debug(
              symbol.product_id.green +
                " total count".cyan +
                (" " + count).yellow
            );
          });
        collectionCursor.count().then((cursorTradeCount) => {
          var numTrades = 0;
          var lastTrade;
          totalCount += cursorTradeCount;
          const collectionCursorStream = collectionCursor.stream();
          var onCollectionCursorEnd = (cb2) => {
            if (numTrades === 0) {
              logger.debug(
                symbol.product_id.green +
                  " sim Ok with ".cyan +
                  ("" + totalCount).yellow +
                  " records"
              );
              totalCount = 0;
              cursor = 0;
              clockNow = null;
              logger.debug(
                symbol.product_id.green +
                  " get balance ".cyan +
                  (" " + s.balance.currency).yellow
              );
              //   console.log('SimSymbol lookback '.cyan, s.symbols[symbol.product_id].lookback.length, 'trades ', s.symbols[symbol.product_id].my_trades.length, 'balance ', s.balance.currency)
              if (cb2) cb2();
              return;
            }
            if (lastTrade) cursor = lastTrade.time;
            // if (collectionCursorStream) collectionCursorStream.close()
            getNext(symbol, cb);
          };
          if (cursorTradeCount === 0) {
            return onCollectionCursorEnd(cb);
          }
          collectionCursorStream.on("data", function (trade) {
            if (!clockNow) {
              clockNow = engine.initClock(trade);
            }
            lastTrade = trade;
            numTrades++;
            // console.log('xxxx...', trade.time, so.start, trade.time < so.start)
            engine.updateKLine(symbol, trade, trade.time < so.start);
            // eventBus.emit('kline', symbol, trade, trade.time < so.start)
            engine.refreshBotData();
            if (
              numTrades &&
              cursorTradeCount &&
              cursorTradeCount == numTrades
            ) {
              onCollectionCursorEnd(cb);
            }
          });
        });
      }
      function getBots(botId, cb) {
        var botCollection = collectionService(conf).getBots();
        botCollection
          .find({ id: botId })
          .sort({ time: -1 })
          .limit(1)
          .toArray()
          .then((botDatas) => {
            logger.debug(
              "botDatas".green +
                " " +
                botDatas.length.toString().cyan +
                " " +
                JSON.stringify(botDatas, null, 2)
            );
            /*  botCollection.find({}).count().then((botLen) => {
               console.log('All bots count is'.green, botLen)
             }) */
            if (cb) cb(botDatas);
          });
      }
      function getSims(botId, cb) {
        simCollection
          .find({ id: botId })
          .sort({ time: -1 })
          .limit(100)
          .toArray()
          .then((simDatas) => {
            logger.debug(
              "simDatas".green +
                " " +
                simDatas.length.toString().cyan +
                " " +
                JSON.stringify(simDatas, null, 2)
            );
            if (cb) cb(simDatas);
          });
      }
      function saveSim(botId, cb) {
        let id = crypto.randomBytes(4).toString("hex");
        let simRes = Object.assign(getBacktestData(s), {
          bid: botId || -1,
          id,
          _id: id,
          time: new Date().getTime(),
        });
        simRes.status.status = "finished";
        simRes.status.startTime = so.start;
        simRes.status.endTime = so.end;
        // console.log('simRes', simRes.id, simRes.data.symbols)
        simCollection
          .insertOne(simRes)
          .then((res) => {
            if (cb) cb(simRes);
          })
          .catch((err) => {
            console.error(err);
            process.exit(0);
          });
      }
    });
};
