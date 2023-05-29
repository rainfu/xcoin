module.exports = {
  apps: [
    {
      name: "binance_server",
      script: "./xcoin.js",
      cron_restart: "50 */6 * * *",
      restart_delay: 100,
      args: "server binance --conf ./data/config/binance/demo.json",
    },
    {
      name: "binance_demo",
      script: "./xcoin.js",
      watch: ["./data/pm2/restart_binance_demo.json"],
      args: "trade binance --conf ./data/config/binance/demo.json --with_server",
    },
  ],
};
