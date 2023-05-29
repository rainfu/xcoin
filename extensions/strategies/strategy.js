var ti = require("../../lib/technicalindicators"),
  {
    getInputValues,
    sendSignal,
    getCrossPoint,
  } = require("../../lib/strategy-helper"),
  z = require("zero-fill"),
  n = require("numbro"),
  debug = require("../../lib/debug");

module.exports = function (so) {
  // var strategiesMap = new Map()
  var crossMap = new Map();
  var main = {
    calculate(symbol) {
      // console.log('cal s..', symbol.product_id, symbol.lookback.length)
      //  console.log('symbol.lookback.length', symbol.lookback.length, so.strategy)
      //  let calStart = (new Date()).getTime()
      so.strategy.strategies.forEach((st) => {
        // console.log('calculate lookback', symbol.lookback.length, so.min_periods, st.input.period, (so.min_periods - symbol.lookback.length) > st.input.period)
        //  if (symbol.in_preroll && st.input.period && (so.min_periods - symbol.lookback.length) > st.input.period) return
        if (!symbol.period.strategy)
          symbol.period.strategy = {
            [st.name + "_buyCrossCount"]: 0,
            [st.name + "_sellCrossCount"]: 0,
          };
        //  console.time('cal2')
        if (!st.inputParams) {
          st.inputParams = {};
          st.input.forEach((input) => {
            st.inputParams[input.name] = input.value;
          });
        }
        if (st.group === "candlestick") {
          symbol.period.strategy.pattern = 0;
          symbol.period.strategy.patternname = "";
          if (st.buyPoint) {
            for (let i = 0; i < st.inputParams.buyPatterns.length; i++) {
              let inLookback = symbol.lookback.slice(1);
              let buyPatterns = ti[st.inputParams.buyPatterns[i].toLowerCase()](
                Object.assign(
                  getInputValues(inLookback, st.inputParams.valType),
                  { reversedInput: true }
                )
              );
              if (buyPatterns) {
                symbol.period.strategy.patternname =
                  st.inputParams.buyPatterns[i].toLowerCase();
                symbol.period.strategy.pattern = buyPatterns ? -1 : 0;
                break;
              }
            }
          }
          if (st.sellPoint) {
            for (let i = 0; i < st.inputParams.sellPatterns.length; i++) {
              let inLookback = symbol.lookback.slice(1);
              let sellPatterns = ti[
                st.inputParams.sellPatterns[i].toLowerCase()
              ](
                Object.assign(
                  getInputValues(inLookback, st.inputParams.valType),
                  { reversedInput: true }
                )
              );
              if (sellPatterns) {
                symbol.period.strategy.patternname =
                  st.inputParams.sellPatterns[i].toLowerCase();
                symbol.period.strategy.pattern = sellPatterns ? 1 : 0;
                break;
              }
            }
          }
        } else {
          // let str
          //  let currentStrage = symbol.product_id + "_" + st.name
          //  if (strategiesMap.has(currentStrage)) {
          //      str = strategiesMap.get(currentStrage)
          //  }
          //  else {
          //      str = new ti[st.name](Object.assign({}, st.inputParams, { values: [] }))
          //      strategiesMap.set(currentStrage, str)
          //  }
          //  let res = str.nextValue(getInputValue(symbol.period, st.inputParams.valType))
          let input = Object.assign(
            {},
            st.inputParams,
            getInputValues(symbol.lookback, st.inputParams.valType),
            { reversedInput: true }
          );
          //console.log('\n' + symbol.lookback.length, st.name.toLowerCase(), JSON.stringify(input))
          let res = ti[st.name.toLowerCase()](input);
          //  console.log('res', res)
          if (res.length) {
            let last = res.shift();
            if (typeof last === "object") {
              Object.keys(last).forEach((key) => {
                symbol.period.strategy[key] = last[key];
              });
            } else {
              symbol.period.strategy[st.name] = last;
            }
          }
        }
        //  console.log('cal', symbol.period.strategy)
        //  console.log('cal', symbol.product_id, symbol.period.close, symbol.period.strategy)
        if (st.buyPoint) this.cross(symbol, st, st.buyPoint.op, "buy");
        if (st.sellPoint) this.cross(symbol, st, st.sellPoint.op, "sell");

        // console.log(st.name, symbol.period.strategy)

        //   console.log(st.name, crossMap)
        // console.log(symbol.lookback.length + ' strategy', st.name, symbol.period.strategy[st.name])
        //  console.timeEnd('cal2')
      });
      // let calTime = ((new Date()).getTime() - calStart)
      // debug.msg(so.strategy.name.cyan + ' cal '.green + ',use time '.green + calTime.toString().yellow + ' ms in period '.green + symbol.lookback.length.toString().yellow)
    },
    onPeriod(symbol, cb) {
      if (symbol.in_preroll) return;
      // console.log('onPeriod', symbol.product_id, symbol.signal)
      if (!symbol.inBuyPositionSide) symbol.signal = null;
      if (!symbol.inSignal) {
        let sellSignal = false,
          buySignal = false;
        so.strategy.strategies.forEach((st) => {
          if (st.sellPoint && st.sellPoint.connect === "and") {
            sellSignal =
              sellSignal && symbol.period.strategy[st.name + "_sell"];
          } else if (st.sellPoint && st.sellPoint.connect === "or") {
            sellSignal =
              sellSignal || symbol.period.strategy[st.name + "_sell"];
          } else if (st.sellPoint && st.sellPoint.connect === "base") {
            sellSignal = symbol.period.strategy[st.name + "_sell"];
          }
          if (st.buyPoint && st.buyPoint.connect === "and") {
            buySignal = buySignal && symbol.period.strategy[st.name + "_buy"];
          } else if (st.buyPoint && st.buyPoint.connect === "or") {
            buySignal = buySignal || symbol.period.strategy[st.name + "_buy"];
          } else if (st.buyPoint && st.buyPoint.connect === "base") {
            buySignal = symbol.period.strategy[st.name + "_buy"];
          }
        });
        if (sellSignal) {
          debug.msg(
            symbol.product_id.green +
              " " +
              so.strategy.name.cyan +
              " send signal ".green +
              "sell ".cyan
          );
          sendSignal(so, symbol, "sell");
        }
        if (buySignal) {
          debug.msg(
            symbol.product_id.green +
              " " +
              so.strategy.name.cyan +
              " send signal ".green +
              "buy ".cyan
          );
          sendSignal(so, symbol, "buy");
        }
      }
      cb();
    },
    onReport(symbol, isHeader = false) {
      // console.log('symbol', symbol)
      if (isHeader) {
        var cols = [];
        so.strategy.strategies.forEach((st) => {
          st.output.forEach((out) => {
            if (out.report) {
              cols.push(z(12, out.name, " ").cyan);
            }
          });
        });
        return cols;
      } else {
        if (symbol.in_preroll) return;
        var cols = [];
        if (symbol.period.strategy) {
          Object.keys(symbol.period.strategy).forEach((key) => {
            // console.log('key', key, symbol.period.strategy[key])
            let currentOutput;
            so.strategy.strategies.forEach((st) => {
              let find = st.output.find((o) => o.name === key);
              if (find) {
                currentOutput = find;
                return;
              }
            });

            if (currentOutput && currentOutput.report) {
              // console.log('currentOutput', key, symbol.period.strategy[key])
              cols.push(
                z(
                  12,
                  n(symbol.period.strategy[key]).format(
                    symbol.increment,
                    Math.floor
                  ),
                  " "
                ).cyan
              );
            }
          });
        }
        return cols;
      }
    },
    cross(symbol, st, op, type) {
      let name = st.name + "_" + type;
      let lines = getCrossPoint(symbol, 0, st, type);
      if (op.indexOf("cross") >= 0) {
        let currentStrage = symbol.product_id + "_" + name;
        let cross;
        if (crossMap.has(currentStrage)) {
          cross = crossMap.get(currentStrage);
        } else {
          if (op === "crossUp")
            cross = new ti.CrossUp({ lineA: [], lineB: [] });
          else cross = new ti.CrossDown({ lineA: [], lineB: [] });
          crossMap.set(currentStrage, cross);
        }
        symbol.period.strategy[name] = cross.nextValue(lines[0], lines[1]);
        // console.log('xx', op, symbol['preLine_' + type], lines, symbol.period.strategy[name])
        if (symbol.period.strategy[name]) {
          symbol.period.strategy[st.name + "_" + type + "CrossCount"]++;
          //  if (symbol.period.strategy[type + 'CrossCount'] === 1) symbol.period.strategy[name] = false //TODO:why first time wrong
          //  console.log('aa', currentStrage, lines, symbol.period.strategy[name], symbol.period.strategy[type + 'CrossCount'])
          //  console.log(symbol.product_id, name, symbol.lookback.length, type + 'CrossCount', lines, symbol.period.strategy[type + 'CrossCount'])
        }
        // symbol['preLine_' + type] = lines
        /* if (symbol.lookback.length > 1) {
                    symbol.period.strategy[name] = ti[op](Object.assign(getCrossLines(symbol, st, type), { reversedInput: true }))
                } */
        // console.log(name, symbol.period.strategy[name], lines[0], lines[1])
      } else {
        if (op === "equal") {
          symbol.period.strategy[name] = lines[0] === lines[1];
          if (symbol.period.strategy[name]) {
            symbol.period.strategy[st.name + "_" + type + "CrossCount"]++;
          }
        } else if (op === "gt") {
          symbol.period.strategy[name] = lines[0] > lines[1];
        } else if (op === "lt") {
          symbol.period.strategy[name] = lines[0] < lines[1];
        }
      }
    },
  };
  return main;
};
