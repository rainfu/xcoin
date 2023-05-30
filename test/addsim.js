const spawn = require("child_process").spawn,
  colors = require("colors");
var xcoin_cmd = process.platform === "win32" ? "xcoin.bat" : "xcoin.sh";
var command_args = [
  "sim",
  "binanceusdm",
  "--conf",
  "./data/sim/temp.json",
  "--start",
  "202305280000",
  "--end",
  "202305280600",
  "--debug",
];
console.log("\n ----- Start backtest from client ".cyan, command_args);
var simProcess = spawn(
  require("path").resolve(__dirname, "../", xcoin_cmd),
  command_args
);
simProcess.stdout.pipe(process.stdout);
simProcess.stderr.pipe(process.stderr);
/* simProcess.stdout.on('data', (data) => {
        console.log(`sim: ${data}`);
      }); */
simProcess.on("error", (error) => {
  console.log("error".cyan, error);
});
simProcess.on("exit", (code) => {
  if (code) {
    console.log(
      "\n ----- Sim error,exit with code".cyan,
      code.yellow,
      " ------\n"
    );
    return;
  }
  console.log("\n ----- Sim ok ------\n".cyan);
});
