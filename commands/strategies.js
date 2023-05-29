var coreFactory = require("../lib/core"),
  colors = require("colors");

module.exports = function (program, conf) {
  program
    .command("strategies")
    .description("list available strategies")
    .action(function (/*cmd*/) {
      var core = coreFactory(null, conf);
      let data = core.getStrategies();
      data.forEach((strat) => {
        console.log(
          strat.name.cyan +
            (strat.name === (conf.strategy && conf.strategy.name)
              ? " (default)".green
              : "")
        );
        if (strat.group) {
          console.log("  group: ".cyan + strat.group.cyan);
        }
        if (strat.des) {
          console.log("  description: ".cyan + strat.des.cyan);
        }
        if (strat.strategies) {
          console.log("  combine strategies:".cyan);
          strat.strategies.forEach((st) => {
            console.log("        " + st.name.cyan);
            console.log("          input:".cyan);
            st.input.forEach((input) => {
              console.log(
                ("            --" + input.name).green +
                  "=<value>".cyan +
                  (" (default: ".cyan + input.value + ")")
              );
            });
            console.log("          output:".cyan);
            st.output.forEach((output) => {
              console.log(
                ("            --" + output.name).green +
                  (" (type: ".cyan + output.type + ")") +
                  (" (pos: ".cyan + output.pos + ")")
              );
            });
            if (st.buyPoint) {
              console.log(
                "          buyPoint: ".cyan +
                  (st.buyPoint.source + "").green +
                  " " +
                  (st.buyPoint.op + "").gray +
                  " " +
                  (st.buyPoint.target + "").green
              );
            }
            if (st.sellPoint) {
              console.log(
                "          sellPoint: ".cyan +
                  (st.sellPoint.source + "").green +
                  " " +
                  (st.sellPoint.op + "").gray +
                  " " +
                  (st.sellPoint.target + "").green
              );
            }
          });
        } else {
          console.log("  input:".cyan);
          Object.keys(strat.input).forEach((key) => {
            console.log(
              ("    --" + key).green +
                "=<value>".cyan +
                " (default: ".cyan +
                strat.input[key] +
                ")".cyan
            );
          });
          if (strat.buyPoint) {
            console.log(
              "  buyPoint: ".cyan +
                (strat.buyPoint.source + "").green +
                " " +
                (strat.buyPoint.op + "").gray +
                " " +
                (strat.buyPoint.target + "").green
            );
          }
          if (strat.sellPoint) {
            console.log(
              "  sellPoint: ".cyan +
                (strat.sellPoint.source + "").green +
                " " +
                (strat.sellPoint.op + "").gray +
                " " +
                (strat.sellPoint.target + "").green
            );
          }
        }
        console.log();
      });

      //  console.log('getStrategies', JSON.stringify(data, null, 2))
      process.exit();
    });
};
