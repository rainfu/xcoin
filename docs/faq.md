# FAQ

Here are some frequently asked questions and responses from the community.

If you have a question that isn't answered here, please ask it in the community

Thanks!

## Question

### [Trading](#trading)

* [Will I make money with XCoin?](#will-i-make-money-with-xcoin)
* [Why do simulations, paper trading, and live trading all yield different results?](#why-do-simulations-paper-trading-and-live-trading-all-yield-different-results)
* [Why should I use simulations or paper trading if they do not reflect live trading?](#why-should-i-use-simulations-or-paper-trading-if-they-do-not-reflect-live-trading)
* [Does XCoin use Limit (maker) orders or Market (taker) orders?](#does-xcoin-use-limit-maker-orders-or-market-taker-orders)

## Answer

### Trading

#### Will I make money with XCoin?

That depends… Different configurations and strategies will yield different results.

The current default config and parameters will likely lose you money, so proceed with caution. Try running simulations and paper trading first to see how the bot acts (see warning below).

#### Why do simulations, paper trading, and live trading all yield different results?

Simulations and paper trading almost always give overly optimistic results compared to live trading. This is because simulations and paper trading both make assumptions about when/if an order is filled.

Because XCoin defaults to using Limit orders (which often lessen fees), there tends to be much more slippage (the difference between when the bot decides to buy and when it actually buys) in live trading. Due to this, live trading is almost always worse than sims and paper trading.

Also, remember that past results do not guarantee future returns.

#### Why should I use simulations or paper trading if they do not reflect live trading?

Simulations are more optimistic than paper trading.
Paper trading is more optimistic than live trading.
Therefore, if a simulation does not yield good results, odds are that neither will paper trading or (by extension) live trading.

#### Does XCoin use Limit (maker) orders or Market (taker) orders?

XCoin uses Limit orders by default because on most exchanges, Limit orders result in lower fees than Market orders. For instance, on GDAX there is no fee for a Limit order trade compared to a 0.25% (BTC) or 0.3% (ETH & LTC) trade fee on a Market order.
