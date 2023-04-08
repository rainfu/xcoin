module.exports = function (conf) {
  return {
    getBots: () => {
      conf.db.mongo.collection('bots').createIndex({ time: -1 })
      return conf.db.mongo.collection('bots')
    },
    getSims: () => {
      conf.db.mongo.collection('sim').createIndex({ bid: 1, time: 1 })
      return conf.db.mongo.collection('sim')
    },
    getTrades: () => {
      conf.db.mongo.collection('trades').createIndex({ selector: 1, time: 1 })
      return conf.db.mongo.collection('trades')
    },
    getTickers: () => {
      conf.db.mongo.collection('tickers').createIndex({ selector: 1, time: 1 })
      return conf.db.mongo.collection('tickers')
    },
  }
}

