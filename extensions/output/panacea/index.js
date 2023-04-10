const webSocket = require('ws')
  , random_port = require('random-port')
  , helpers = require('../../../lib/helpers')
  , debug = require('../../../lib/debug')
  , apiFactory = require('./api/api')
module.exports = function panacea(s, conf, engine, keyboard) {
  let aliveCount = 0
  let api = apiFactory()
  var wsServer = {
    wss: null,
    run: function () {
      if (!s.options.output.panacea.port || s.options.output.panacea.port === 0) {
        random_port({ from: 17000, range: 1000 }, function (port) {
          this.startServer(s.options.output.panacea.ip, port)
        })
      } else {
        this.startServer(s.options.output.panacea.ip, s.options.output.panacea.port)
      }
    },
    reply: function (ws, data) {
      debug.msg('reply ' + data.action + " " + JSON.stringify(data).length)
      ws.send(JSON.stringify(data))
    },
    startServer: function (ip, port) {
      var self = this
      this.wss = new webSocket.Server({ host: ip, port: port })
      const interval = setInterval(() => {
        this.wss.clients.forEach(function each(ws) {
          if (ws.isAlive === false) {
            aliveCount--
            return ws.terminate();
          }
          ws.isAlive = false;
          ws.ping();
        });
      }, 60000);
      this.wss.on('close', function close() {
        clearInterval(interval);
      });
      console.log('WebSocket running on ws://%s:%s'.green, ip, port)
      this.wss.on('connection', (ws) => {
        aliveCount++
        ws.isAlive = true;
        debug.msg('Websocket new client join '.cyan + aliveCount.toString().cyan)
        this.init(ws)
        ws.on('pong', () => {
          ws.isAlive = true
        });
        ws.on('message', (data) => {
          try {
            let message = JSON.parse(data)
            debug.msg('receive message ' + message.action)
            /** client user auth */
            if (message.action !== 'getTickers' && message.action !== 'checkVersion' && message.action !== 'getProducts' && message.action !== 'getPickerNormal') {
              if (!message.apiKey || message.apiKey !== conf.secret.keys.apiKey) {
                self.reply(ws, {
                  action: 'none',
                  toast: 'bot.apiKeyError'
                })
                return
              }
            }
            switch (message.action) {
              case 'init':
                self.init()
                break;
              case "refresh":
                self.refresh()
                break;
              default:
                api[message.action](message, (data) => {
                  self.reply(ws, data)
                }, s, conf, engine, keyboard)
                break
            }
          } catch (e) {
            self.reply(ws, {
              action: 'error',
              data: e.toString()
            })
            console.log('error', e)
          }
        })

      })
    },
    /**
     * init all bot status
     * @param {} ws 
     */
    async init(ws) {
      if (s.status.status === 'created') {
        let data = {
          action: 'ready'
        }
        this.reply(ws, data)
        while (s.status.status !== 'ready') {
          await helpers.sleep(3000)
        }
      }
      data = {
        action: 'init',
        data: api.getInitData(s)
      }
      this.reply(ws, data)
      s.status.status = 'work'
    },
    /**
     * broadcast all symbols real-time data to all client
     * @returns 
     */
    refresh: function () {
      if (!this.wss) return
      if (s.status.status !== 'work') return
      this.wss.clients.forEach(client => {
        if (client.readyState === 1) {
          let data = {
            action: 'refresh',
            data: api.getRefreshData(s)
          }
          this.reply(client, data)
        }
      })
    }
  }
  return wsServer
}
