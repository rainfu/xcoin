const collectionService = require("../../../../lib/mongo-service"),
  spawn = require("child_process").spawn,
  colors = require("colors"),
  path = require("path");

const getBacktestList = (message, cb, s, conf) => {
  let collectionServiceInstance = collectionService(conf);
  let bots = collectionServiceInstance.getBots();
  bots
    .find({ "status.status": "finished" })
    .skip(message.data.from)
    .limit(message.data.limit)
    .sort({ time: -1 })
    .toArray((err, botArray) => {
      if (err) return;
      let data = {
        action: message.action,
        data: botArray,
      };
      if (cb) cb(data);
    });
};
const delBacktest = (message, cb, s, conf) => {
  let collectionServiceInstance = collectionService(conf);
  let bots = collectionServiceInstance.getBots();
  bots.deleteOne({ _id: message.data.id }).then((res) => {
    if (res.deletedCount) {
      let data = {
        action: message.action,
        data: {
          id: message.data.id,
        },
        toast: "backtest." + message.action + "Ok",
      };
      if (cb) cb(data);
    }
  });
};
const getSimList = (message, cb, s, conf) => {
  let simCollection = collectionService(conf).getSims();
  simCollection
    .find(message.data.query)
    .skip(message.data.from)
    .limit(message.data.limit)
    .sort({ time: -1 })
    .toArray((err, simArray) => {
      console.log("getSimList", message.data, err, simArray);
      if (err) return;
      let data = {
        action: message.action,
        data: simArray,
      };
      if (cb) cb(data);
    });
};
const delSim = (message, cb, s, conf) => {
  let collectionServiceInstance = collectionService(conf);
  let simList = collectionServiceInstance.getSims();
  simList.deleteOne({ _id: message.data.id }).then((res) => {
    if (res.deletedCount) {
      let data = {
        action: message.action,
        data: {
          id: message.data.id,
        },
        toast: "backtest." + message.action + "Ok",
      };
      if (cb) cb(data);
    }
  });
};
const backtestSim = (message, cb) => {
  var xcoin_cmd = process.platform === "win32" ? "xcoin.bat" : "xcoin.sh";
  var command_args = [
    "sim",
    message.data.exchange,
    "--bot",
    message.data.bid,
    "--sim_options",
    message.data.options,
  ];
  console.log("Start backtest for bot ".green);
  var simProcess = spawn(
    path.resolve(__dirname, "../../", xcoin_cmd),
    command_args
  );
  simProcess.stdout.pipe(process.stdout);
  simProcess.stderr.pipe(process.stderr);
  simProcess.on("exit", (code) => {
    if (code) {
      console.log("simProcess exit with code".green, code);
      process.exit(code);
      return;
    }
    let data = {
      action: message.action,
      toast: "trade." + message.action + "Ok",
    };
    if (cb) cb(data);
  });
};
const addSim = (message, cb) => {
  var target = require("path").resolve(
    __dirname,
    "../../../../data/sim/temp.json"
  );
  let tempConfig = message.data.config;
  delete tempConfig.symbols;
  if (tempConfig.server && tempConfig.server.save_pairs) {
    tempConfig.watch_symbols = tempConfig.server.save_pairs;
  }
  require("fs").writeFileSync(
    target,
    JSON.stringify(message.data.config, null, 2)
  );
  // console.log('target',target)
  var xcoin_cmd = process.platform === "win32" ? "xcoin.bat" : "xcoin.sh";
  var command_args = [
    "sim",
    message.data.exchange,
    "--conf",
    "./data/sim/temp.json",
    "--start",
    message.data.options.startTime,
    "--end",
    message.data.options.endTime,
    "--debug",
  ];
  console.log("\n ----- Start backtest from client ".cyan, command_args);
  var simProcess = spawn(
    path.resolve(__dirname, "../../../../", xcoin_cmd),
    command_args
  );
  simProcess.stdout.pipe(process.stdout);
  simProcess.stderr.pipe(process.stderr);
  /* simProcess.stdout.on('data', (data) => {
        console.log(`sim: ${data}`);
      }); */
  simProcess.on("error", (error) => {
    console.log("error".cyan, error);
    let data = {
      action: message.action,
      toast: "backtest." + message.action + "Error",
    };
    if (cb) cb(data);
    return;
  });
  simProcess.on("exit", (code) => {
    if (code) {
      console.log(
        "\n ----- Sim error,exit with code".cyan,
        code.yellow,
        " ------\n"
      );
      let data = {
        action: message.action,
        toast: "backtest." + message.action + "Error",
      };
      if (cb) cb(data);
      return;
    }
    let data = {
      action: message.action,
      toast: "backtest." + message.action + "Ok",
    };
    if (cb) cb(data);
    console.log("\n ----- Sim ok ------\n".cyan);
  });
};
module.exports = {
  addSim,
  backtestSim,
  getBacktestList,
  getSimList,
  delBacktest,
  delSim,
};
