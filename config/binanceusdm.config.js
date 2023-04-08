module.exports = {
  apps: [
    {
      name: 'server',
      script: './xcoin.js',
      cron_restart: "50 */6 * * *",
      restart_delay: 100,
      args: 'server binanceusdm --conf ./data/config/binanceusdm/1mf.json'
    }
    ,
    {
      name: 'trade',
      script: './xcoin.js',
      watch: ['./data/pm2/restart_binanceusdm_rain.json'],
      args: 'trade binanceusdm --conf ./data/config/binanceusdm/30mf.json --with_server'
    },
    {
      name: 'trade1m',
      script: './xcoin.js',
      watch: ['./data/pm2/restart_binanceusdm_demo.json'],
      args: 'trade binanceusdm --conf ./data/config/binanceusdm/1mf.json --with_server'
    }
  ]
};
