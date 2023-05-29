var minimist = require("minimist"),
  path = require("path"),
  colors = require("colors"),
  _ = require("lodash");

module.exports = function (program, conf) {
  program
    .command("server [exchangename]")
    .allowUnknownOption()
    .description(
      "run another websocket process to get tickers data and excure help method out of the main thred"
    )
    .option("--conf <path>", "path to optional conf overrides file")
    .option("--port <port>", "watch-tickers port")
    .option("--debug", "output detailed debug info")
    .option("--sim_price", "sim price changed to test bot")
    .option("--proxy <proxy>", "use proxy", String, conf.proxy)
    .action(function (exchangename, cmd) {
      let so = JSON.parse(JSON.stringify(minimist(process.argv)));
      let exchange;
      delete so._;
      if (cmd.conf) {
        var overrides = require(path.resolve(process.cwd(), cmd.conf));
        Object.keys(overrides).forEach(function (k) {
          so[k] = overrides[k];
        });
      }
      Object.assign(so, { exchange: exchangename });
      try {
        exchange = require(path.resolve(
          __dirname,
          `../extensions/exchanges/${so.exchange}/exchange`
        ))(conf, so);
      } catch (e) {
        exchange = require(path.resolve(
          __dirname,
          `../extensions/exchanges/ccxt/exchange`
        ))(conf, so);
      }
      if (!exchange) {
        console.error("exchange not implemented");
        process.exit(1);
      }
      writeHead();
      exchange.refreshProducts((products) => {
        /* products = products.filter(p => {
          // console.log('p.sasset', p.asset, /(\d)[S|L]$/.test(p.asset))
          return p.currency === 'USDT' && !/(\d+)[S|L]$/.test(p.asset)
        }) */
        console.log(
          "\nStart watch filted tickers ".green +
            products.length.toString().cyan
        );
        let websocket = require(path.resolve(__dirname, `../lib/ws_server`))(
          conf,
          exchange,
          so
        );
        websocket.run();
        websocket.broadcast({ symbols: products });

        /*    
         let symbols = products.map(p => {
          return { product_id: p.asset + '-' + p.currency }
        })
             //test get tickers
                websocket.getTickers({ symbols }, (res) => {
                  console.log('getTicers Ok', res.res, res.data.length)
                }) */
        //test get kline
        /*   websocket.getKLines({ product_id: 'BTC-USDT', period: '1m', limit: 10 }, (res) => {
            console.log('getKLines Ok', res.res, res.data.length)
          })
          websocket.getProducts((res) => {
            console.log('getProducts Ok', res.res, res.data.length)
          })
          websocket.sleep(3000).then(res => {
            console.log('sleep Ok', 3000)
          })
          websocket.getTrades({ product_id: 'BTC-USDT', limit: 10 }, (res) => {
            console.log('getProducts Ok', res.res, res.data)
          }) */
        /* websocket.getPickerNormal({ number: 10, limit: 10, period: '1d' }, (res) => {
          console.log('getPickerNormal Ok', res.res, res.data)
        }) */
      });
      function writeHead() {
        var head = `\nSTART WATCH ${exchange.name.toUpperCase()} TICKERS`;
        console.log(head.green);
        if (so.proxy) {
          console.log("!!! Use Proxy:", so.proxy);
        }
      }
    });
};
