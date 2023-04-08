# 使用PM2管理机器人

XCoin建议您通过pm2管理您的机器人，通过pm2您可以

- 保证主线程持续运行
- 方便地同时启动主线程与价格更新线程
- 方便地在参数变化时重新启动线程
  缺点：如果使用pm2启动线程，部分键盘事件可能无法在服务器端使用

## 安装  pm2

```bash
yarn global add pm2
```

## 如何使用

假设您需要通过pm2管理一个使用币安期货进行交易的机器人组，组内包含两个机器人，一个数据更新线程。您需要

1. 在/config/下建立一个binanceusdm.config.js的文件

```javascript
module.exports = {
  apps: [
    {
      name: 'server',//价格更新
      script: './xcoin.js',
      cron_restart: "50 */6 * * *",//每6小时重新启动一次
      restart_delay: 100,
      args: 'server binanceusdm --conf ./data/config/binanceusdm/1mf.json'//运行指定的配置文件 
    }
    ,
    {
      name: 'trade',//30分钟周期交易线程
      script: './xcoin.js',
      watch: ['./data/pm2/restart_binanceusdm_rain.json'],//止文件变更时重启
      args: 'trade binanceusdm --conf ./data/config/binanceusdm/30mf.json --with_server'//运行指定的配置文件
    },
    {
      name: 'trade1m',//1分钟周期交易线程
      script: './xcoin.js',
      watch: ['./data/pm2/restart_binanceusdm_demo.json'],//止文件变更时重启
      args: 'trade binanceusdm --conf ./data/config/binanceusdm/1mf.json --with_server'//运行指定的配置文件
    }
  ]
};
```

2. 在 pakcage.json文件添加
   
   ```javascript
   "binanceusdm": "pm2 start ./config/binanceusdm.config.js",
   ```

3. 终端运行

```bash
yarn binanceusdm
```

4. 通过pm2查看当前运行状态
   
   - pm2 list 获得所有运行的任务
   
   - pm2 monit 查看任务的所有输出
   
   - pm2 delete all 终止所有任务
   
   - pm2 restart server 重新启动 server 任务

5. 在客户端配置更改并需要重新启动服务器时，在websocket.js代码中运行如下
   
   ```javascript
   if (message.restart) {
       console.log('\nSome Core Param changed .should restart process...'.orange)
       var target3 = require('path').resolve(__dirname, '../../data/pm2/restart_' + s.options.exchange + "_" + (s.options.name || '') + '.json')
       require('fs').writeFileSync(target3, JSON.stringify({ event: 'updateConfig', time: moment().format('MMDD HH:mm:ss') }, null, 2))
   }
   ```

```
## 运行不同交易所的多个机器人

如果您希望通过pm2运行基于不同交易所的多个机器人，您只需要交上述步骤重复一遍，比如 通过 yarn mexc来交易抹茶的产品。注意

- 任务名不能重复

- config.base上的name最好使用新的名字以免restart文件重复
```
