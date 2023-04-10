# Main execution documents

Provide a list of executable files for Xcoin

## exchange.js

Provide exchange related functions, through which you can obtain or test specific exchange functions, such as obtaining wallet balances, updating products, pricing, or buying and selling specified products

## server.js

Regularly update the real-time prices of all or specified products on the specified exchange through a separate thread. By default, ccxt's websocket mode is used for updates. If the exchange does not provide ws mode, HTTP mode is used for updates

If you want to run multiple bots based on the same exchange on two hosts, or if you want to reduce the pressure on the main thread by updating prices through separate threads, we suggest that you use this method

## sim.js

Simulate exchange trading through specified bot trading records or specified time and product to test the effectiveness of parameters or strategies. The historical data comes from the price history of specific transaction pairs saved by server.js

## strategies.js

Obtain descriptions of all policies

## trade.js

Trading through specified configurations, controlling whether it is a real or virtual transaction through paper, and using with_ The server controls whether the price update mechanism is obtained through server.js or its own round robin. Please refer to the transaction parameter configuration section for other transaction parameters
