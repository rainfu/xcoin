module.exports = {
  apps: [
    {
      name: 'binance_server',
      script: './xcoin.js',
      cron_restart: "50 */6 * * *",
      restart_delay: 100,
      args: 'server binance --conf ./data/config/binance/30m.json'
    }
    ,
    {
      name: 'binance_trade',
      script: './xcoin.js',
      watch: ['./data/pm2/restart_binance_liu.json'],
      args: 'trade binance --conf ./data/config/binance/30m.json --with_server'
    }
  ]
};
