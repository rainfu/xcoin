
var _ = require('lodash')
    , moment = require('moment')
    , debug = require('../../../../lib/debug')

/** update config group */
const updateConfig = (message, cb, s) => {
    Object.assign(s.options, message.data)
    s.options.modified = message.data
    if (message.data.strategy) {
        s.options.strategy = message.data.strategy
    }
    if (!_.isUndefined(message.data.debug)) {
        debug.flip()
        s.options.debug = debug.on
    }
    if (message.data.takerFee || message.data.makerFee) {
        s.exchange.initFees()
    }
    try {
        let newConfig = _.defaultsDeep({ modified: message.data }, s.options)
        //  let filename = s.options.strategy.name + "_" + s.options.period + "_" + (new Date().getTime())
        var target = require('path').resolve(__dirname, '../../../' + s.options.conf)
        require('fs').writeFileSync(target, JSON.stringify(newConfig, null, 2))
        var target2 = require('path').resolve(__dirname, '../../../data/config/last_config.json')
        require('fs').writeFileSync(target2, JSON.stringify(newConfig, null, 2))
        //  console.log('wrote config', target)
        if (message.restart) {
            console.log('\nSome Core Param changed .should restart process...'.orange)
            var target3 = require('path').resolve(__dirname, '../../../data/pm2/restart_' + s.options.exchange + "_" + (s.options.name || '') + '.json')
            require('fs').writeFileSync(target3, JSON.stringify({ event: 'updateConfig', time: moment().format('MMDD HH:mm:ss') }, null, 2))
        }
    } catch (e) {
        console.log('updateConfig error', e)
    }
    let data = {
        action: message.action,
        data: s.options,
        toast: 'trade.' + message.action + 'Ok'
    }
    if (cb) cb(data)
}
const updateSymbolFuture = (message, cb, s) => {
    if (message.data.type === 'marginMode') {
        s.exchange.updateMarginMode({
            marginType: message.data.value,
            product_id: message.symbol
        }, (err) => {
            if (err) return
            let data = {
                action: message.action,
                toast: 'trade.' + message.action + 'Ok'
            }
            if (cb) cb(data)
        })
    } else if (message.data.type === 'leverage') {
        s.exchange.updateLeverage({
            leverage: message.data.value,
            product_id: message.symbol
        }, (err) => {
            if (err) return
            let data = {
                action: message.action,
                toast: 'trade.' + message.action + 'Ok'
            }
            if (cb) cb(data)
        })
    }
}


module.exports = {
    updateConfig,
    updateSymbolFuture
}