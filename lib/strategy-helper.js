var moment = require('moment')
  , debug = require("./debug")

const getInputValues = (lookback, valType) => {
  if (valType.length === 1) return { values: lookback.map(d => d[valType[0]]) }
  let output = {}
  valType.forEach(key => {
    output[key] = lookback.map(d => d[key])
  })
  return output

}

const getInputValue = (period, valType) => {
  if (valType.length === 1) {
    return period[valType[0]]
  }
  let output = {}
  valType.forEach(key => {
    output[key] = period[key]
  })
  return output
}

const getCrossLines = (symbol, strategySettings, type) => {
  let pointA = getCrossPoint(symbol, 0, strategySettings, type)
  let pointB = getCrossPoint(symbol, 1, strategySettings, type)
  return {
    lineA: [pointA[0], pointB[0]],
    lineB: [pointA[1], pointB[1]]
  }
}

const getCrossPoint = (symbol, index, strategySettings, type) => {

  let point = type === 'buy' ? strategySettings.buyPoint : strategySettings.sellPoint
  let source, target
  if (symbol.lookback[index].hasOwnProperty(point.source)) {
    source = symbol.lookback[index][point.source]
  } else if (symbol.lookback[index].strategy.hasOwnProperty(point.source)) {
    source = symbol.lookback[index].strategy[point.source]
  } else if (strategySettings.inputParams.hasOwnProperty(point.source)) {
    source = strategySettings.inputParams[point.source]
  } else if (typeof point.source === 'number') {
    source = point.source
  } else if (typeof point.source === 'boolean') {
    source = point.source ? 1 : 0
  }
  if (symbol.lookback[index].hasOwnProperty(point.target)) {
    target = symbol.lookback[index][point.target]
  } else if (symbol.lookback[index].strategy.hasOwnProperty(point.target)) {
    target = symbol.lookback[index].strategy[point.target]
  } else if (strategySettings.inputParams.hasOwnProperty(point.target)) {
    target = strategySettings.inputParams[point.target]
  } else if (typeof point.target === 'number') {
    target = point.target
  } else if (typeof point.target === 'boolean') {
    target = point.target ? 1 : 0
  }
  // console.log('get point', { [point.source]: source, [point.target]: target })
  return [source, target]
}

const sendSignal = (so, symbol, action = 'buy') => {
  let name = so.strategy.name
  if (action === 'buy') {
    if (so.market === 'only_long') {
      // console.log('sendAction', symbol.product_id, name, 'buy', 'long')
      sendAction(symbol, name, 'buy', 'long')
    } else if (so.market === 'only_short') {
      if (symbol.last_buy_type && symbol.last_buy_type.indexOf('short') >= 0) {
        // console.log('sendAction', symbol.product_id, name, 'sell', 'short')
        sendAction(symbol, name, 'sell', 'short')
      }
    } else if (so.market === 'both') {
      if (symbol.last_buy_type && symbol.last_buy_type.indexOf('short') >= 0 && symbol.action !== 'sold') {
        // console.log('sendAction', symbol.product_id, name, 'sell', 'short')
        sendAction(symbol, name, 'sell', 'short')
        /* if (so.buy_position_side_when_sell) {
          setTimeout(() => {
            //    console.log('sendAction', symbol.product_id, name, 'buy', 'long')
            sendAction(symbol, name, 'buy', 'long')
          }, so.poll_position_side_time)
        } */
      }
      else {
        sendAction(symbol, name, 'buy', 'long')
      }

    }
  }
  else {
    if (so.market === 'only_long') {
      if (symbol.last_buy_type && symbol.last_buy_type.indexOf('long') >= 0) {
        //   console.log('sendAction', symbol.product_id, name, 'sell', 'long')
        sendAction(symbol, name, 'sell', 'long')
      }
    } else if (so.market === 'only_short') {
      // console.log('sendAction', symbol.product_id, name, 'buy', 'short')
      sendAction(symbol, name, 'buy', 'short')
    } else if (so.market === 'both') {
      if (symbol.last_buy_type && symbol.last_buy_type.indexOf('long') >= 0 && symbol.action !== 'sold') {
        //   console.log('sendAction', symbol.product_id, name, 'sell', 'long')
        sendAction(symbol, name, 'sell', 'long')
        /* if (so.buy_position_side_when_sell) {
          setTimeout(() => {
            //    console.log('sendAction', symbol.product_id, name, 'buy', 'short')
            sendAction(symbol, name, 'buy', 'short')
          }, so.poll_position_side_time)
        } */
      }
      else {
        //    console.log('sendAction', symbol.product_id, name, 'buy', 'short')
        sendAction(symbol, name, 'buy', 'short')
      }

    }
  }
}
const sendAction = (symbol, name, action, position) => {
  if (action === 'buy') {//cancel buy when....
    if (symbol.action === 'buying' || symbol.action === 'selling' || symbol.action === 'partSell' || symbol.action === 'bought') return
    if (symbol.last_sell_period && symbol.period.period_id === symbol.last_sell_period) {
      //cancel signal when in same peroid
      return
    }
  }
  if (action === 'sell') {//cancel sell when...
    if (symbol.action === 'buying' || symbol.action === 'selling' || !symbol.action || symbol.action === 'sold') return
  }
  symbol.signal = action
  symbol.inSignal = position
  symbol[`last_${action}_type`] = `${name}_${action}_${position}`
  console.log(('\n' + moment(symbol.period.latest_trade_time).format('YYYY-MM-DD HH:mm:ss') + " " + symbol.product_id.cyan + ' ' + (symbol[`last_${action}_type`])[position === 'long' ? 'bgCyan' : 'bgGreen'] + ', price: ' + symbol.period.close).green)
}
module.exports = {
  getInputValues,
  getInputValue,
  sendSignal,
  sendAction,
  getCrossPoint,
  getCrossLines
}
