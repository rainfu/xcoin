//db
const db = {
    // mongo configuration
    mongo: {
        connectionString: null,
        host: '127.0.0.1',
        port: 27017,
        replicaSet: null,
        authMechanism: null,
        username: null,
        password: null
    }
}
const keys = {
    //pre defined api key for client app connect
    apiKey: 'YOUR API KEY FOR CLINET APP',
    //exchange api key
    binance: {
        key: 'YOUR BINANCE API KEY',
        secret: 'YOUR BINANCE API SECRET',
    },
    binanceusdm: {
        key: 'YOUR BINANCEUSDM API KEY',
        secret: 'YOUR BINANCEUSDM API SECRET',
        takerFee: 'YOUR BINANCEUSDM CUSTOM TAKER FEE',
        makerFee: 'YOUR BINANCEUSDM CUSTOM MAKER FEE'
    }
}
module.exports = {
    db,
    keys
}