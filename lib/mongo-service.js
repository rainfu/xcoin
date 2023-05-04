module.exports = function (conf) {
  return {
    getBots: () => {
      try {
        conf.db.mongo.collection('bots').createIndex({ time: -1 })
        return conf.db.mongo.collection('bots')
      } catch (e) {
        return {
          err: true,
          message: e.toString()
        }
      }
    },
    getSims: () => {
      try {
        conf.db.mongo.collection('sim').createIndex({ bid: 1, time: 1 })
        return conf.db.mongo.collection('sim')
      } catch (e) {
        return {
          err: true,
          message: e.toString()
        }
      }
    },
    getTrades: () => {
      try {
        conf.db.mongo.collection('trades').createIndex({ selector: 1, time: 1 })
        return conf.db.mongo.collection('trades')
      } catch (e) {
        return {
          err: true,
          message: e.toString()
        }
      }
    },
    getTickers: () => {
      try {
        conf.db.mongo.collection('tickers').createIndex({ selector: 1, time: 1 })
        return conf.db.mongo.collection('tickers')
      } catch (e) {
        return {
          err: true,
          message: e.toString()
        }
      }
    },
  }
}

