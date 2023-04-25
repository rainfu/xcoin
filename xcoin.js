var path = require('path')
  , program = require('commander')
  , _ = require('lodash')
  , minimist = require('minimist')
  , version = require('./package.json').version
  , loggerInstance = require("./lib/logger")
  , EventEmitter = require('events')
  , fs = require('fs')

program._name = 'xcoin'
program.version = version
initXcoin(function (err, xcoin) {
  if (err) {
    throw err
  }
  var command_directory = './commands'
  fs.readdir(command_directory, function (err, files) {
    if (err) {
      throw err
    }
    var commands = files.map((file) => {
      return path.join(command_directory, file)
    }).filter((file) => {
      return fs.statSync(file).isFile() && file.lastIndexOf('.js') >= 0
    })
    commands.forEach((file) => {
      require(path.resolve(__dirname, file.replace('.js', '')))(program, xcoin.conf)
    })
    program
      .command('*', 'Display help', { noHelp: true })
      .action((cmd) => {
        console.log('Invalid command: ' + cmd)
        program.help()
      })
    program.parse(process.argv)
  })
})

/**
   * init xcoin config ,db and other core 
   * @param {*} cb 
   */
function initXcoin(cb) {
  var xcoin = { version }
  var args = minimist(process.argv.slice(3))
  xcoin.conf = initConfig(args)
  initExtra(xcoin.conf, args)
  initDb(xcoin, xcoin.conf, cb)
}

/**
   * init xcoin config params
   * @param {*} args 
   * @returns 
   */
function initConfig(args) {
  // 1. load base conf.js 
  let config = {}, secret = {}, conf = {}, overrides = {}, overridesSecret = {}
  try {
    conf = require('./config/conf-base')
    secret = require('./config/conf-secret')
  } catch (err) {
    console.error(err + ' base config file is not present!')
    process.exit(1)
  }
  // 2. load conf overrides file if present or last_config
  if (!_.isUndefined(args.conf)) {
    try {
      overrides = require(path.resolve(process.cwd(), args.conf))
    } catch (err) {
      console.error(err + ', failed to load input conf overrides file!')
    }
  }
  else {
    // 2. load last used conf overrides file if present
    try {
      overrides = require(path.resolve(process.cwd(), './data/config/last_config.json'))
    } catch (err) {
      // logger.error(err + ', failed to load last conf overrides file!')
    }
  }
  //3. load use defined exchange secret
  if (!_.isUndefined(args.secret)) {
    try {
      overridesSecret = require(path.resolve(process.cwd(), args.secret))
    } catch (err) {
      console.error(err + ', failed to load input secret overrides file!')
    }
  }
  config = _.defaultsDeep(config, args, overrides, conf)
  secret = _.defaultsDeep(overridesSecret, secret)
  config.secret = secret
  config.logger = loggerInstance(config)
  return config
}
/**
 * init xcoin extra 
 * @param {*} conf 
 * @param {*} args 
 */
function initExtra(conf, args) {
  module.exports.debug = args.debug
  var eventBus = new EventEmitter()
  conf.eventBus = eventBus
}
/**
 * init xcoin database
 * @param {*} xcoin 
 * @param {*} conf 
 * @param {*} cb 
 */
function initDb(xcoin, conf, cb) {
  var authStr = '', authMechanism, connectionString
  if (conf.secret.db.mongo.username) {
    authStr = encodeURIComponent(conf.secret.db.mongo.username)
    if (conf.secret.db.mongo.password) authStr += ':' + encodeURIComponent(conf.secret.db.mongo.password)
    authStr += '@'
    authMechanism = conf.secret.db.mongo.authMechanism || 'DEFAULT'
  }
  if (conf.secret.db.mongo.connectionString) {
    connectionString = conf.secret.db.mongo.connectionString
  } else {
    connectionString = 'mongodb://' + authStr + conf.secret.db.mongo.host + ':' + conf.secret.db.mongo.port + '/' + conf.db.mongo.db + '?' +
      (conf.secret.db.mongo.replicaSet ? '&replicaSet=' + conf.secret.db.mongo.replicaSet : '') +
      (authMechanism ? '&authMechanism=' + authMechanism : '')
  }
  require('mongodb').MongoClient.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true }, function (err, client) {
    if (err) {
      console.error('WARNING: MongoDB Connection Error: ', err)
      console.error('WARNING: without MongoDB some features (such as backfilling/simulation) may be disabled.')
      console.error('Attempted authentication string: ' + connectionString)
      if (cb) cb(null, xcoin)
      return
    }
    var db = client.db(conf.db.mongo.db)
    _.set(conf, 'db.mongo', db)
    if (cb) cb(null, xcoin)
  })
}