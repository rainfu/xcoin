const path = require('path')
const log4js = require('log4js')
const dir = process.cwd()

log4js.configure({
    appenders: {
        console: { type: 'console' },
        app: {
            type: 'dateFile',
            maxLogSize: "10M",
            filename: path.join(dir, "./data/logs/app.log")
        }
    },
    categories: {
        default: {
            appenders: ['console'], level: 'trace',//all log
        },
        app: {
            appenders: ['app'], level: 'debug',
        },
    }
})

const logger = log4js.getLogger("app")
module.exports = logger


