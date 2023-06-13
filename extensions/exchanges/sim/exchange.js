let path = require("path"),
  n = require("numbro"),
  _ = require("lodash");

module.exports = function sim(conf, so, s) {
  let latency = 100; // In milliseconds, enough to be realistic without being disruptive
  var real_exchange;
  try {
    real_exchange = require(path.resolve(
      __dirname,
      `../${so.exchange}/exchange`
    ))(conf, so);
  } catch (e) {
    real_exchange = require(path.resolve(__dirname, "../ccxt/exchange"))(
      conf,
      so
    );
  }
  var now;
  var last_order_id = 1001;
  var orders = {};
  var openOrders = {};
  var logger = conf.logger;
  // When orders change in any way, it's likely our "_hold" values have changed. Recalculate them
  function recalcHold(product_id) {
    let balance = s.balance;
    balance.currency_hold = 0;
    s.symbols[product_id].asset_hold = 0;
    _.each(openOrders, function (order) {
      if (order.tradetype === "buy") {
        balance.currency_hold += n(order.remaining_size)
          .multiply(n(order.price))
          .value();
      } else {
        s.symbols[product_id].asset_hold += n(order.remaining_size).value();
      }
    });
  }

  var exchange = {
    name: "sim",
    historyScan: real_exchange.historyScan,
    historyScanUsesTime: real_exchange.historyScanUsesTime,
    makerFee: real_exchange.makerFee,
    takerFee: real_exchange.takerFee,
    dynamicFees: real_exchange.dynamicFees,
    getProducts: real_exchange.getProducts,
    updateSymbols(symbols) {
      products = this.getProducts();
      return symbols.filter((sy) => {
        return products.find((p) => p.normalized === sy.normalized);
      });
    },
    initFees: function () {
      //User can change the fees from client ,so we sould reset the fees for this
      real_exchange.initFees();
      if (so.future) {
        this.makerFee = real_exchange.makerFee * (so.leverage || 20);
        this.takerFee = real_exchange.takerFee * (so.leverage || 20);
      } else {
        this.makerFee = real_exchange.makerFee;
        this.takerFee = real_exchange.takerFee;
      }
    },
    refreshProducts: function (cb, force = false) {
      return real_exchange.refreshProducts(cb, force);
    },
    getTrades: function (opts, cb) {
      return real_exchange.getTrades(opts, cb);
    },
    getKLines: function (opts, cb) {
      return real_exchange.getKLines(opts, cb);
    },
    getBalance: function (opts, cb) {
      setTimeout(function () {
        let symbol = so.symbols.find(
          (s) => s.currency === opts.currency && s.asset === opts.asset
        );
        if (!symbol) symbol = { product_id: opts.asset + "-" + opts.currency };
        let balance = {
          currency: s.balance.currency,
          currency_hold: s.balance.currency_hold,
          asset: s.symbols[symbol.product_id].asset_amount,
          asset_hold: s.symbols[symbol.product_id].asset_hold,
          unrealizedProfit: s.symbols[symbol.product_id].unrealizedProfit,
          leverage: s.symbols[symbol.product_id].leverage,
          isolated: s.symbols[symbol.product_id].isolated,
          positionSide: "LONG",
        };
        /* balance.assets = {
          ETH: { asset: 1, asset_hold: 0 },
          BTC: { asset: 0.5, asset_hold: 0 },
        }; */
        // console.log('getBalance..', balance)
        return cb(null, balance);
      }, latency);
    },
    getQuote: function (opts, cb) {
      if (so.mode === "paper" && !so.sim_price) {
        return real_exchange.getQuote(opts, cb);
      } else {
        setTimeout(function () {
          return cb(null, {
            bid: s.symbols[opts.product_id].period.close,
            ask: s.symbols[opts.product_id].period.close,
          });
        }, latency);
      }
    },
    getTickers: function (opts, cb) {
      if (so.mode === "paper") {
        return real_exchange.getTickers(opts, cb);
      } else {
        setTimeout(function () {
          let priceArr = Object.keys(opts).map((key) => {
            return opts[key].period.close;
          });
          return cb(null, priceArr);
        }, latency);
      }
    },
    cancelOrder: function (opts, cb) {
      setTimeout(function () {
        var order_id = "~" + opts.order_id;
        var order = orders[order_id];

        if (order.status === "open") {
          order.status = "cancelled";
          delete openOrders[order_id];
          recalcHold(opts.product_id);
        }

        cb(null);
      }, latency);
    },

    buy: function (opts, cb) {
      setTimeout(function () {
        logger.debug(
          `buying ${opts.size * opts.price} vs on hold: ${
            s.balance.currency
          } - ${s.balance.currency_hold} = ${
            s.balance.currency - s.balance.currency_hold
          }`
        );
        if (
          opts.size * opts.price >
          s.balance.currency - s.balance.currency_hold
        ) {
          logger.debug("nope");
          return cb(null, { status: "rejected", reject_reason: "balance" });
        }

        var result = {
          id: last_order_id++,
        };
        if (so.mode !== "live") {
          now = new Date().getTime();
        }
        var order = {
          id: result.id,
          status: "open",
          price: opts.price,
          size: opts.size,
          orig_size: opts.size,
          remaining_size: opts.size,
          post_only: !!opts.post_only,
          filled_size: 0,
          ordertype: opts.order_type,
          tradetype: "buy",
          orig_time: now,
          time: now,
          created_at: now,
          position_side: opts.position_side,
          product_id: opts.product_id,
        };
        orders["~" + result.id] = order;
        openOrders["~" + result.id] = order;
        recalcHold(order.product_id);
        cb(null, order);
        setTimeout(() => {
          if (so.mode !== "live") {
            exchange.processTrade({
              price: order.price,
              size: order.size,
              time: order.time + so.order_adjust_time + 1,
              product_id: order.product_id,
            });
          }
        }, latency);
      }, latency);
    },

    sell: function (opts, cb) {
      setTimeout(function () {
        logger.debug(
          `selling ${opts.size} vs on hold: ${
            s.symbols[opts.product_id].asset_amount
          } - ${s.symbols[opts.product_id].asset_hold} = ${
            s.symbols[opts.product_id].asset_amount -
            s.symbols[opts.product_id].asset_hold
          }`
        );
        if (
          opts.size >
          s.balance.asset - s.symbols[opts.product_id].asset_hold
        ) {
          logger.debug("nope");
          return cb(null, { status: "rejected", reject_reason: "balance" });
        }

        var result = {
          id: last_order_id++,
        };
        if (so.mode !== "live") {
          now = new Date().getTime();
        }
        var order = {
          id: result.id,
          status: "open",
          price: opts.price,
          size: opts.size,
          orig_size: opts.size,
          remaining_size: opts.size,
          post_only: !!opts.post_only,
          filled_size: 0,
          ordertype: opts.order_type,
          tradetype: "sell",
          orig_time: now,
          time: now,
          created_at: now,
          position_side: opts.position_side,
          product_id: opts.product_id,
        };
        orders["~" + result.id] = order;
        openOrders["~" + result.id] = order;
        recalcHold(opts.product_id);
        cb(null, order);
        setTimeout(() => {
          if (so.mode !== "live") {
            exchange.processTrade({
              price: order.price,
              size: order.size,
              time: order.time + so.order_adjust_time + 1,
              product_id: order.product_id,
            });
          }
        }, latency);
      }, latency);
    },

    getOrder: function (opts, cb) {
      setTimeout(function () {
        var order = orders["~" + opts.order_id];
        cb(null, order);
      }, latency);
    },

    getCursor: real_exchange.getCursor,

    getTime: function () {
      return now;
    },

    processTrade: function (trade) {
      now = trade.time;
      // console.log('processTrade', trade)
      _.each(openOrders, function (order) {
        if (trade.time - order.time < so.order_adjust_time) {
          return; // Not time yet
        }
        if (
          order.tradetype === "buy" &&
          (so.mode === "sim" || trade.price <= order.price)
        ) {
          processBuy(order, trade);
          recalcHold(order.product_id);
        } else if (
          order.tradetype === "sell" &&
          (so.mode === "sim" || trade.price >= order.price)
        ) {
          processSell(order, trade);
          recalcHold(order.product_id);
        }
      });
    },
  };

  function processBuy(buy_order, trade) {
    let fee = 0;
    let size = Math.min(buy_order.remaining_size, trade.size);
    if (so.mode === "sim") {
      size = buy_order.remaining_size;
    }
    let price = buy_order.price;

    // Add estimated slippage to price
    if (so.order_type === "maker") {
      price = n(price)
        .add(n(price).multiply(so.avg_slippage_pct / 100))
        .format("0.00000000");
    }

    let total = n(price).multiply(size);

    // Compute fees
    if (so.order_type === "maker" && exchange.makerFee) {
      fee = n(size)
        .multiply(exchange.makerFee / 100)
        .value();
    } else if (so.order_type === "taker" && exchange.takerFee) {
      fee = n(size)
        .multiply(exchange.takerFee / 100)
        .value();
    }
    s.symbols[buy_order.product_id].asset_amount = Number(
      n(s.symbols[buy_order.product_id].asset_amount)
        .add(size)
        .subtract(fee)
        .format(
          s.symbols[buy_order.product_id].asset_increment
            ? s.symbols[buy_order.product_id].asset_increment
            : so.price_format
        )
    );
    s.balance.currency = Number(
      n(s.balance.currency).subtract(total).format(so.price_format)
    );
    // Process existing order size changes
    let order = buy_order;
    order.filled_size = order.filled_size + size;
    order.remaining_size = order.size - order.filled_size;

    if (order.remaining_size <= 0) {
      logger.debug(buy_order.product_id.green, "full fill bought".cyan);
      order.status = "done";
      order.done_at = trade.time;
      delete openOrders["~" + order.id];
    } else {
      logger.debug(buy_order.product_id.green, "partial fill buy".cyan);
    }
  }

  function processSell(sell_order, trade) {
    let fee = 0;
    let size = Math.min(sell_order.remaining_size, trade.size);
    if (so.mode === "sim") {
      size = sell_order.remaining_size;
    }
    let price = sell_order.price;

    // Add estimated slippage to price
    if (so.order_type === "maker") {
      price = n(price)
        .subtract(n(price).multiply(so.avg_slippage_pct / 100))
        .format("0.00000000");
    }

    let total = n(price).multiply(size);
    if (sell_order.position_side === "SHORT") {
      let initTotal = n(s.symbols[trade.product_id].last_buy_price).multiply(
        size
      );
      total = initTotal + (initTotal - total);
    }

    // Compute fees
    if (so.order_type === "maker" && exchange.makerFee) {
      fee = n(total)
        .multiply(exchange.makerFee / 100)
        .value();
    } else if (so.order_type === "taker" && exchange.takerFee) {
      fee = n(total)
        .multiply(exchange.takerFee / 100)
        .value();
    }

    s.symbols[sell_order.product_id].asset_amount = Number(
      n(s.symbols[sell_order.product_id].asset_amount)
        .subtract(size)
        .format(
          s.symbols[sell_order.product_id].asset_increment
            ? s.symbols[sell_order.product_id].asset_increment
            : so.price_format
        )
    );
    if (s.symbols[sell_order.product_id].asset_amount < 0) {
      s.symbols[sell_order.product_id].asset_amount = 0;
    }
    s.balance.currency = Number(
      n(s.balance.currency).add(total).subtract(fee).format(so.price_format)
    );
    // Process existing order size changes
    let order = sell_order;
    order.filled_size = order.filled_size + size;
    order.remaining_size = order.size - order.filled_size;

    if (order.remaining_size <= 0) {
      logger.debug(sell_order.product_id.green, "full fill sold".cyan);
      order.status = "done";
      order.done_at = trade.time;
      delete openOrders["~" + order.id];
    } else {
      logger.debug(sell_order.product_id.green, "partial fill sell".cyan);
    }
  }
  so.symbols = exchange.updateSymbols(so.symbols);
  return exchange;
};
