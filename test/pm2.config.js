module.exports = {
  apps: [{
    name: 'pm2',
    script: './test/pm2.js',
    cron_restart: "1 * * * *",
    restart_delay: 100,
  }]
};
