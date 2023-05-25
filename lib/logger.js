const path = require('path')
const log4js = require('log4js')
const dir = process.cwd()
module.exports = function logger(config) {
    log4js.configure({
        appenders: {
            console: { type: 'console' },
            app: {
                type: 'dateFile',
                maxLogSize: "10M",
                keepFileExt:true,
                numBackups:20,
                filename: path.join(dir, "./data/logs/bot-" + config.name + ".log")
            }
        },
        categories: {
            default: {
                appenders: ['console'], level: 'trace',//all log
            },
            app: {
                appenders: ['app'], level: 'debug',
            },
        },
        pm2: config.with_server
    })

    const logger = log4js.getLogger("app")
    return logger
}

