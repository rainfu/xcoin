module.exports = {
  apps: [
    {
      name: "mexc_server",
      script: "./xcoin.js",
      cron_restart: "50 */6 * * *",
      restart_delay: 100,
      args: "server mexc --conf ./data/config/mexc/demo1.json",
    },
    {
      name: "demo1",
      script: "./xcoin.js",
      watch: ["./data/pm2/restart_mexc_demo1.json"],
      args: "trade mexc --conf ./data/config/mexc/demo1.json --with_server",
    },
    {
      name: "demo2",
      script: "./xcoin.js",
      watch: ["./data/pm2/restart_mexc_demo2.json"],
      args: "trade mexc --conf ./data/config/mexc/demo2.json --with_server",
    },
  ],
};
