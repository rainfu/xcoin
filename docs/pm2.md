# Use PM2  manage bots

XCoin recommends that you manage your bot through pm2, through pm2 you can

- Keep the main thread running continuously
- Conveniently start main thread and price update thread at the same time
- Conveniently restart threads when parameters change

Disadvantage: If you use pm2 to start the thread, some keyboard events may not be available on the server side

## Install

```bash
yarn global add pm2
```

## How to

Suppose you need to manage a bot group that uses Binance Futures for trading through pm2. The group contains two bots and one price update thread. you need

1. Create a binanceusdm.config.js file under /config/

```javascript
module.exports = {
   apps: [
     {
       name: 'server', //price update
       script: './xcoin.js',
       cron_restart: "50 */6 * * *",//restart every 6 hours
       restart_delay: 100,
       args: 'server binanceusdm --conf ./data/config/binanceusdm/1mf.json'//run the specified configuration file
     }
     ,
     {
       name: 'trade', //30-minute cycle trading thread
       script: './xcoin.js',
       watch: ['./data/pm2/restart_binanceusdm_rain.json'], //restart when the file is changed
       args: 'trade binanceusdm --conf ./data/config/binanceusdm/30mf.json --with_server'//run the specified configuration file
     },
     {
       name: 'trade1m', //1 minute cycle trading thread
       script: './xcoin.js',
       watch: ['./data/pm2/restart_binanceusdm_demo.json'], //restart when the file is changed
       args: 'trade binanceusdm --conf ./data/config/binanceusdm/1mf.json --with_server'//run the specified configuration file
     }
   ]
};
```

2. Add in the pakcage.json file

```javascript
    "binanceusdm": "pm2 start ./config/binanceusdm.config.js",
```

3. Terminal operation

```bash
yarn binance usdm
```

4. View the current running status through pm2

    - pm2 list get all running tasks

    - pm2 monit to see all output from tasks

    - pm2 delete all terminates all tasks

    - pm2 restart server restarts the server task

5. When the client configuration changes and the server needs to be restarted, run the following in the websocket.js code

```javascript
    if (message. restart) {
        console.log('\nSome Core Param changed.should restart process...'.orange)
        var target3 = require('path').resolve(__dirname, '../../data/pm2/restart_' + s.options.exchange + "_" + (s.options.name || '') + '.json')
        require('fs').writeFileSync(target3, JSON.stringify({ event: 'updateConfig', time: moment().format('MMDD HH:mm:ss') }, null, 2))
    }
```

## Running multiple bots on different exchanges

If you want to run multiple bots based on different exchanges through pm2, you only need to repeat the above steps, such as trading matcha products through yarn mexc. Notice

- The task name cannot be repeated

- It is better to use a new name for the name on config.base to avoid duplication of restart files
