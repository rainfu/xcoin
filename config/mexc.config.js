module.exports = {
  apps: [
    {
      name: 'mexc_server',
      script: './xcoin.js',
      cron_restart: "50 */6 * * *",
      restart_delay: 100,
      args: 'server mexc --conf ./data/config/mexc/demo_with_server.json'
    },
    {
      name: 'trade',
      script: './xcoin.js',
      watch: ['./data/pm2/restart_mexc_mexc_server.json'],
      args: 'trade mexc --conf ./data/config/mexc/demo_with_server.json --with_server'
    }
  ]
};
