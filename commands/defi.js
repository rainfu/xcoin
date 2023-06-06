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
    .command("defi [exchange]")
    .allowUnknownOption()
    .description("test defi function")
    .option("--debug", "output with debug info")
    .option(
      "--watch_symbols <watch_symbols>",
      "watch_symbols",
      String,
      conf.watch_symbols
    )
    .option("--secret <path>", "custom exchange api secret", String, "")
    .option("--proxy <proxy>", "use proxy", String, conf.proxy)
    .option("--pair", "get pair info")
    .option("--token", "get token info")
    .option("--refresh", "refresh products")
    .option("--fix", "clear not use product")
    .action(function (exchangename, cmd) {
      let so = {};
      conf.proxy = cmd.proxy;
      conf.watch_symbols = cmd.watch_symbols;
      conf.buy_pct = cmd.buy;
      conf.sell_pct = cmd.sell;
      conf.position_side = (cmd.balance || "long").toUpperCase();
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
        console.log("e", exchangename, e);
        exchange = require(path.resolve(
          __dirname,
          "../extensions/exchanges/ccxt/exchange"
        ))(conf, so);
      }
      console.log("so.symbols", so.symbols);
      //implement pair
      if (so.pair) {
        //get pair
        let opts = {
          product_id: so.symbols[0].product_id,
        };
        console.log("getPair.", opts);
        exchange.getPair(opts, function (err, pair) {
          if (err) console.log("error", err);
          console.log("getPair.", pair);
          process.exit(0);
        });
        return;
      }

      //implement token
      if (so.token) {
        //get token
        let opts = {
          token: so.symbols[0].asset,
        };
        exchange.getToken(opts, function (err, token) {
          if (err) console.log("error", err);
          console.log("getToken.", token);
          process.exit(0);
        });
        return;
      }
      //implement refrsh  products
      if (so.fix) {
        debug.msg("start fix  products".green + " " + exchange.name.yellow);
        fixProducts();
        let oldProducts = exchange.getProducts();
        console.log("oldProducts length", oldProducts.length);
        let clearedHolders = oldProducts.filter((p) => p.holders > 1500);
        console.log("clearHolders length", clearedHolders.length);
        clearedHolders = clearedHolders.filter(
          (p) => !p.reserveUSD || (p.reserveUSD && p.reserveUSD > 100000)
        );
        console.log("clearLiquids length", clearedHolders.length);
        var target = require("path").resolve(
          __dirname,
          "../extensions/exchanges/" + exchange.name,
          "products.json"
        );
        require("fs").writeFileSync(
          target,
          JSON.stringify(clearedHolders, null, 2)
        );
        console.log("wrote", target);
        process.exit(1);
        return;
      }
      if (so.refresh) {
        let oldProducts = ec.getProducts();
        console.log("old..products", oldProducts);
        ec.refreshProducts(function (products) {
          filterSymbols(
            s,
            products,
            so.rain_symbol_only_usdt,
            so.rain_no_etfls,
            0,
            (fitSymbols, info) => {
              console.log(
                "%s: %s,  all:%s,usdt:%s,with-eft:%s,min-vol:%s".green,
                exchange,
                fitSymbols.length,
                info.total,
                info.usdt,
                info.withoutEtf,
                "0"
              );
              let unActives = fitSymbols
                .filter((p) => !p.active)
                .map((p2) => p2.product_id);
              unactiveProducs.push(...unActives);
              if (unActives.length) {
                console.log(
                  "unactiveProducs".green,
                  unActives.length,
                  " ".green,
                  exchange.green,
                  unActives.join(",")
                );
              }
              let newProducts = fitSymbols
                .filter((f) => {
                  const find = oldProducts.find(
                    (p) => p.asset + "-" + p.currency === f.product_id
                  );
                  return !find;
                })
                .map((p2) => p2.product_id);
              if (newProducts.length) {
                console.log(
                  "newProducts".green,
                  newProducts.length,
                  " ".green,
                  exchange.green,
                  newProducts.join(",")
                );
              }
              return;
            }
          );
        });
      }
    });
};
