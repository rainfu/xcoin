module.exports = {
  apps: [
    {
      name: 'binanceusdm_server',
      script: './xcoin.js',
      cron_restart: "50 */6 * * *",
      restart_delay: 100,
      args: 'server binanceusdm --conf ./data/config/binanceusdm/demo.json'
    }
    ,
    {
      name: 'binanceusdm_demo',
      script: './xcoin.js',
      watch: ['./data/pm2/restart_binanceusdm_demo.json'],
      args: 'trade binanceusdm --conf ./data/config/binanceusdm/demo.json --with_server'
    },
    {
      name: 'binanceusdm_demo2',
      script: './xcoin.js',
      watch: ['./data/pm2/restart_binanceusdm_demo2.json'],
      args: 'trade binanceusdm --conf ./data/config/binanceusdm/demo2.json --with_server'
    }
  ]
};
