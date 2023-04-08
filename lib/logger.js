// const winston = require('winston');
//
// const logger = winston.createLogger({
//     level: 'verbose',
//     format: winston.format.combine(
//         winston.format.colorize({all: true}),
//         winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
//         winston.format.printf((info: any) => `[${info.timestamp}] ${info.level}: ${info.message}`),
//     ),
//     transports: [
//         new winston.transports.Console(),
//     ],
// });
// export default logger;
const path = require('path')
const log4js = require('log4js')
const dir = process.cwd()

log4js.configure({
    appenders: {
        console: { type: 'console' },
        app: { type: 'file', filename: path.join(dir, "./data/logs/app.log") }
    },
    categories: {
        default: {
            appenders: ['console', 'app'], level: 'trace',//all log
        },
    }
})

const logger = log4js.getLogger("app")
module.exports = logger


