let n = require("numbro");
module.exports = {
  max_fc_width: 0,
  normalizeSelector: function (selector) {
    var parts = selector.split(".");
    return (
      parts[0].toLowerCase() +
      "." +
      ((parts[1] || "").indexOf("0x") === 0
        ? (parts[1] || "").toLowerCase()
        : (parts[1] || "").toUpperCase())
    );
  },
  objectifySelector: function (selector) {
    var rtn;

    if (typeof selector == "string") {
      var s = this.normalizeSelector(selector);

      var e_id = s.split(".")[0];
      var p_id = s.split(".")[1];
      var asset = p_id.split("-")[0];
      var currency = p_id.split("-")[1];

      rtn = {
        exchange_id: e_id,
        product_id: p_id,
        asset: asset,
        currency: currency,
        normalized: s,
      };
    } else if (typeof selector == "object") {
      rtn = selector;
    }

    return rtn;
  },
  crossover: function (s, key1, key2) {
    return (
      s.symbols[s.selector.product_id].period[key1] >
        s.symbols[s.selector.product_id].period[key2] &&
      s.symbols[s.selector.product_id].lookback[0][key1] <=
        s.symbols[s.selector.product_id].lookback[0][key2]
    );
  },
  crossunder: function (s, key1, key2) {
    return (
      s.symbols[s.selector.product_id].period[key1] <
        s.symbols[s.selector.product_id].period[key2] &&
      s.symbols[s.selector.product_id].lookback[0][key1] >=
        s.symbols[s.selector.product_id].lookback[0][key2]
    );
  },
  crossoverVal: function (p1val1, p1val2, p2val1, p2val2) {
    return p1val1 > p1val2 && p2val1 <= p2val2;
  },
  crossunderVal: function (p1val1, p1val2, p2val1, p2val2) {
    return p1val1 < p1val2 && p2val1 >= p2val2;
  },
  nz: function (src, val = 0) {
    return typeof src != "number" || isNaN(src) ? val : src;
  },
  iff: function (v, r, r2) {
    return v != undefined && v ? r : r2;
  },
  hl2: function (period) {
    return (period.high + period.low) / 2;
  },
  hlc3: function (period) {
    return (period.high + period.low + period.close) / 3;
  },
  ohlc4: function (period) {
    return (period.open + period.high + period.low + period.close) / 4;
  },
  HAhlc3: function (period, lookback) {
    /*
    xClose = (Open+High+Low+Close)/4
    xOpen = [xOpen(Previous Bar) + xClose(Previous Bar)]/2
    xHigh = Max(High, xOpen, xClose)
    xLow = Min(Low, xOpen, xClose)
    */
    let haClose = (period.open + period.high + period.low + period.close) / 4,
      haClosePeriod = lookback != undefined ? lookback : period,
      haClosePrev =
        (haClosePeriod.open +
          haClosePeriod.high +
          haClosePeriod.low +
          haClosePeriod.close) /
        4,
      haOpen = (period.haOpen ? period.haOpen : period.open + haClosePrev) / 2,
      haHigh = Math.max(period.high, haOpen, haClose),
      haLow = Math.min(period.low, haOpen, haClose);
    // save haOpen
    period.haOpen = haOpen;
    return (haClose + haHigh + haLow) / 3;
  },
  HAohlc4: function (period, lookback) {
    /*
    xClose = (Open+High+Low+Close)/4
    xOpen = [xOpen(Previous Bar) + xClose(Previous Bar)]/2
    xHigh = Max(High, xOpen, xClose)
    xLow = Min(Low, xOpen, xClose)
    */
    let haClose = (period.open + period.high + period.low + period.close) / 4,
      haClosePeriod = lookback != undefined ? lookback : period,
      haClosePrev =
        (haClosePeriod.open +
          haClosePeriod.high +
          haClosePeriod.low +
          haClosePeriod.close) /
        4,
      haOpen = (period.haOpen ? period.haOpen : period.open + haClosePrev) / 2,
      haHigh = Math.max(period.high, haOpen, haClose),
      haLow = Math.min(period.low, haOpen, haClose);
    // save haOpen
    period.haOpen = haOpen;
    return (haClose + haOpen + haHigh + haLow) / 4;
  },
  // sample usage: let adjusted_lbks = s.symbols[s.selector.product_id].lookback.map((period, i) => tv.src(period, s.options.src, s.symbols[s.selector.product_id].lookback[i+1]))
  src: function (src, period, lookback) {
    if (!period) throw "helpers src(). period undefined";

    if (!src || src === "close") {
      return period.close;
    } else if (src === "hl2") {
      return module.exports.hl2(period);
    } else if (src === "hlc3") {
      return module.exports.hlc3(period);
    } else if (src === "ohlc4") {
      return module.exports.ohlc4(period);
    } else if (src === "HAhlc3") {
      return module.exports.HAhlc3(period, lookback);
    } else if (src === "HAohlc4") {
      return module.exports.HAohlc4(period, lookback);
    } else throw src + " not supported";
  },
  adjust_by_pct: function (pct, n) {
    return n * (pct / 100 + 1);
  },
  lowest: function (s, key, length) {
    if (s.symbols[s.selector.product_id].lookback.length < length) {
      s.symbols[s.selector.product_id].period[key] = 0;
    } else {
      s.symbols[s.selector.product_id].period[key] = s.symbols[
        s.selector.product_id
      ].period[key] = Math.min(
        s.symbols[s.selector.product_id].period.low,
        ...s.symbols[s.selector.product_id].lookback
          .slice(0, length - 1)
          .map((period) => period.low)
      );
    }
  },
  highest: function (s, key, length) {
    if (s.symbols[s.selector.product_id].lookback.length < length) {
      s.symbols[s.selector.product_id].period[key] = 0;
    } else {
      s.symbols[s.selector.product_id].period[key] = s.symbols[
        s.selector.product_id
      ].period[key] = Math.max(
        s.symbols[s.selector.product_id].period.high,
        ...s.symbols[s.selector.product_id].lookback
          .slice(0, length - 1)
          .map((period) => period.high)
      );
    }
  },
  pivot: function (s, leftBars, rightBars) {
    let totalBars = leftBars + rightBars + 1,
      periods = [
        s.symbols[s.selector.product_id].period,
        ...s.symbols[s.selector.product_id].lookback.slice(0, totalBars - 1),
      ].reverse(),
      lPeriods = periods.slice(0, leftBars),
      rPeriods = periods.slice(leftBars + 1),
      oPeriods = lPeriods.concat(rPeriods),
      countH = oPeriods.reduce((p, c) => {
        return (
          p +
          (typeof c.high !== "undefined" && periods[leftBars].high > c.high
            ? 1
            : 0)
        );
      }, 0),
      countL = oPeriods.reduce((p, c) => {
        return (
          p +
          (typeof c.low !== "undefined" && periods[leftBars].low < c.low
            ? 1
            : 0)
        );
      }, 0);
    return {
      high: countH == oPeriods.length ? periods[leftBars].high : null,
      low: countL == oPeriods.length ? periods[leftBars].low : null,
    };
  },
  async sleep(time) {
    return new Promise((resolve) => {
      setTimeout(resolve, time);
    });
  },
  formatAsset(amt, asset) {
    return n(amt).format("0.00000000") + " " + asset;
  },
  formatPercent(ratio) {
    return (ratio >= 0 ? "+" : "") + n(ratio).format("0.00%");
  },
  formatCurrency(amt, currency, omit_currency, color_trick, do_pad) {
    let str;
    let fstr;
    amt > 999
      ? (fstr = "0.00")
      : amt > 99
      ? (fstr = "0.000")
      : amt > 9
      ? (fstr = "0.0000")
      : amt > 0.9
      ? (fstr = "0.00000")
      : amt > 0.09
      ? (fstr = "0.000000")
      : amt > 0.009
      ? (fstr = "0.0000000")
      : (fstr = "0.00000000");
    str = n(amt).format(fstr);
    if (do_pad) {
      this.max_fc_width = Math.max(this.max_fc_width, str.length);
      str = " ".repeat(this.max_fc_width - str.length) + str;
    }
    if (color_trick) {
      str = str.replace(/^(.*\.)(.*?)(0*)$/, function (_, m1, m2, m3) {
        return m1.cyan + m2.yellow + m3.cyan;
      });
    }
    return str + (omit_currency ? "" : " " + currency);
  },
};
