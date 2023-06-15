"use strict";

//  ---------------------------------------------------------------------------
const exchangeConfig = require("./Const.json");
const ccxt = require("ccxt");
const Exchange = ccxt.Exchange;
const ExchangeError = ccxt.ExchangeError;
const { Swapper } = require("./PancakeswapSwapper");
const { ApolloClient, InMemoryCache, HttpLink } = require("@apollo/client");
const { fetch } = require("cross-fetch");
const {
  getRecentHotTokens,
  getToken,
  getTokens,
  getTokenWithPool,
  getTokenByAsset,
  getTokenExtraInfo,
  getPool,
  getPools,
  getPoolWithHour,
  getPoolWithDay,
  getBundle,
} = require("./Query");
const tb = require("timebucket");
module.exports = class pancakeswap extends Exchange {
  describe() {
    return this.deepExtend(super.describe(), {
      id: "pancakeswap",
      name: "pancakeswap",
      defi: true,
      rateLimit: 10000,
      version: "v1",
      countries: ["US"],
      has: {
        cancelOrder: false,
        CORS: true,
        createLimitOrder: false,
        createMarketOrder: false,
        createOrder: true,
        editOrder: false,
        privateAPI: false,
        fetchBalance: true,
        fetchCurrencies: true,
        fetchL2OrderBook: false,
        fetchMarkets: true,
        fetchOHLCV: true,
        fetchOrderBook: false,
        fetchTicker: true,
        fetchTickers: true,
        fetchTrades: true,
      },
      urls: {},
      requiredCredentials: {
        apiKey: false,
        secret: false,
      },
      api: {},
    });
  }
  constructor(userConfig = {}) {
    super(userConfig);
    this.swapper = new Swapper(this.exchange, this.wallet);
    this.baseTokenAddress =
      exchangeConfig[this.exchange].currency.toLowerCase();
    this.apolloClient = new ApolloClient({
      link: new HttpLink({ uri: exchangeConfig[this.exchange].graphql, fetch }),
      cache: new InMemoryCache(),
      shouldBatch: true,
    });
  }
  async fetchOrderBook(symbol, limit = undefined, params = {}) {
    throw new ExchangeError(
      "Fetching order books is not supported by the API of " + this.id
    );
  }
  async fetchBundle(opts, params = {}) {
    let res;
    console.log("fetchBundle", opts);
    res = await getBundle(this.apolloClient);
    console.log("fetchBundle ok", res);
    return res;
  }
  async fetchToken(opts, params = {}) {
    let res;
    console.log("fetchToken", opts);
    res = await getToken(
      this.apolloClient,
      opts.token,
      exchangeConfig[this.exchange].scankey,
      true
    );
    console.log("fetchToken ok", res);
    return res;
  }
  async fetchTokens(symbols, params = {}) {
    symbols = symbols.map((s) => s.asset);
    console.log("fetchTokens", symbols);
    const res = await getTokens(this.apolloClient, symbols);
    console.log("fetchTokens ok", res);
    return res;
  }
  async fetchMarkets(opts, params = {}) {
    let products = [];
    try {
      products = require(`../../../data/exchanges/pancakeswap_products.json`);
    } catch (e) {}
    let blacklist = [];
    try {
      blacklist = require(`../../../data/exchanges/pancakeswap_blacklist.json`);
    } catch (e) {}
    console.log("products", products.length, "blacklist", blacklist.length);
    let newTokenList = [];
    let since = opts.since || 1;
    let baseTokenAddress = opts.baseTokenAddress || this.baseTokenAddress;
    let minHolders = opts.minHolders || 1000;
    let maxHolders = opts.maxHolders || 50000;
    let limit = opts.limit || 1000;
    let minVolumeUSD = opts.minVolumeUSD || 100000;
    let maxVolumeUSD = opts.maxVolumeUSD || 50000000;
    let minTotalTransactions = opts.minTotalTransactions || 1000;
    //  console.log('fetchMarkets', baseTokenAddress, since, minHolders, limit, minVolumeUSD, minReserveUSD, minTotalTransactions)
    if (since) {
      const query_start = tb().resize("1d").subtract(since).toMilliseconds();
      // console.log('init since..', (new Date()).getTime(), since, query_start)
      since = query_start / 1000;
    }
    let tokens = await getRecentHotTokens(this.apolloClient, since, limit);
    console.log("fetchMarkets get tokens ok", tokens.length);
    tokens = tokens.filter(
      (t) =>
        t.token.txCount >= minTotalTransactions &&
        t.token.volumeUSD >= minVolumeUSD &&
        t.token.volumeUSD <= maxVolumeUSD
    );
    // console.log("fetchMarkets filter tokens ok", tokens.length);
    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i];
      let black = blacklist.find((t) => t.base === token.token.id);
      if (black) continue;
      let find = products.find((t) => t.asset === token.token.id);
      if (find) continue;
      let symbol = {
        base: token.token.id,
        quote: this.baseTokenAddress,
        active: true,
        decimals: token.token.decimals,
        price: token.priceUSD,
        volumeUSD: token.token.volumeUSD,
        txCount: token.token.txCount,
      };
      try {
        symbol = await getTokenExtraInfo(
          null,
          symbol,
          exchangeConfig[this.exchange].scankey
        );
      } catch (e) {
        console.log("getTokenExtraInfo error", e);
      }
      if (
        !symbol.holders ||
        (symbol.holders &&
          symbol.holders >= minHolders &&
          symbol.holders <= maxHolders)
      ) {
        let tokenPool = await getTokenWithPool(
          this.apolloClient,
          baseTokenAddress,
          symbol.base
        );
        //  console.log("tokenpool", tokenPool.whitelistPools);
        if (tokenPool && tokenPool.whitelistPools.length) {
          let fitPool = tokenPool.whitelistPools.find(
            (w) =>
              w.token0.id === baseTokenAddress ||
              w.token1.id === baseTokenAddress
          );
          // console.log("fitPool", fitPool);
          if (fitPool) {
            Object.assign(symbol, {
              id: fitPool.id,
              name:
                fitPool.token0.id === baseTokenAddress
                  ? fitPool.token1.symbol + "/" + fitPool.token0.symbol
                  : fitPool.token0.symbol + "/" + fitPool.token1.symbol,
              csymbol:
                fitPool.token0.id === baseTokenAddress
                  ? fitPool.token0.symbol
                  : fitPool.token1.symbol,
              price:
                fitPool.token0.id === baseTokenAddress
                  ? fitPool.token0Price
                  : fitPool.token1Price,
            });
            newTokenList.push(symbol);
          }
        }
      } else {
        blacklist.push(symbol);
      }
    }
    console.log("newTokenList ok", newTokenList.length);
    return { newTokenList, blacklist };
  }
  async fetchProducts(products, params = {}) {
    let newTokenList = [];
    // console.log("fetchProducts ", products);
    let symbols = products.map((s) => s.asset);
    // console.log("fetchProducts 2", symbols);
    for (let i = 0; i < products.length; i++) {
      let symbol = {
        quote: this.baseTokenAddress,
        active: true,
      };
      const res = await getTokenByAsset(
        this.apolloClient,
        products[i].asset,
        exchangeConfig[this.exchange].scankey,
        true
      );
      if (!res) continue;
      Object.assign(symbol, res, {
        base: res.id,
      });
      let tokenPool = await getTokenWithPool(
        this.apolloClient,
        this.baseTokenAddress,
        symbol.base
      );
      if (tokenPool && tokenPool.whitelistPools.length) {
        let fitPool = tokenPool.whitelistPools.find(
          (w) =>
            w.token0.id === this.baseTokenAddress ||
            w.token1.id === this.baseTokenAddress
        );
        // console.log("fitPool", fitPool);
        if (fitPool) {
          Object.assign(symbol, {
            id: fitPool.id,
            name:
              fitPool.token0.id === this.baseTokenAddress
                ? fitPool.token1.symbol + "/" + fitPool.token0.symbol
                : fitPool.token0.symbol + "/" + fitPool.token1.symbol,
            csymbol:
              fitPool.token0.id === this.baseTokenAddress
                ? fitPool.token0.symbol
                : fitPool.token1.symbol,
            price:
              fitPool.token0.id === this.baseTokenAddress
                ? fitPool.token0Price
                : fitPool.token1Price,
          });
          newTokenList.push(symbol);
        }
      }
    }
    console.log("fetchProducts ok", newTokenList);
    return { newTokenList };
  }
  parseTicker(ticker, pairDayData, market = undefined) {
    /* let timestamp = this.safeTimestamp(ticker, 'timestamp');
        if (timestamp === undefined) {
            timestamp = this.milliseconds();
        } */
    let timestamp = this.milliseconds();
    let id = this.safeString(ticker, "id");

    let last =
      ticker.token0.id === this.baseTokenAddress.toLowerCase()
        ? this.safeNumber(ticker, "token0Price")
        : this.safeNumber(ticker, "token1Price");
    let volume = 0;
    // console.log('hourData', hourData)
    let hourVolume = "0";
    let dayVolume = "0";
    //  console.log('pairDayData', pairDayData, dayVolume)
    return {
      symbol: id,
      timestamp: timestamp,
      datetime: this.iso8601(timestamp),
      high: last,
      low: last,
      bid: last,
      bidVolume: undefined,
      ask: last,
      askVolume: undefined,
      vwap: undefined,
      open: undefined,
      close: last,
      last: last,
      previousClose: undefined,
      change: undefined,
      percentage: undefined,
      average: undefined,
      baseVolume: volume,
      quoteVolume: volume * last,
      dayVolume: dayVolume,
      hourVolume: hourVolume,
      info: ticker,
    };
  }
  sign(
    path,
    api = "public",
    method = "GET",
    params = {},
    headers = undefined,
    body = undefined
  ) {
    let url;
    if (api === "bscscan") {
      url =
        exchangeConfig[this.exchange].scan +
        "/" +
        this.implodeParams(path, params);
    } else {
      url =
        exchangeConfig[this.exchange].scan +
        "/" +
        this.version +
        "/" +
        this.implodeParams(path, params);
    }
    const query = this.omit(params, this.extractParams(path));
    if (Object.keys(query).length) {
      url += "?" + this.urlencode(query);
    }
    console.log("url", url);
    return { url: url, method: method, body: body, headers: headers };
  }

  async request(
    path,
    api = "public",
    method = "GET",
    params = {},
    headers = undefined,
    body = undefined
  ) {
    const response = await this.fetch2(
      path,
      api,
      method,
      params,
      headers,
      body
    );
    if ("error" in response) {
      if (response["error"]) {
        throw new ExchangeError(this.id + " " + this.json(response));
      }
    }
    return response;
  }
  async fetchBalance(tokens = [], params = {}) {
    const balance = await this.swapper.getBalances(tokens, params);
    return balance;
  }
  async fetchOrder(id, params = {}) {
    //  https://api.bscscan.com/api?module=account&action=txlistinternal&txhash=0x651c965d8c9396deccd1128b178ea76f27a4cd8099862a3d941130d9201cf8c0&apikey=V433U58M7ZWPZ38PMPJS1HVS5AF7S5F9WZ
    // https://api.bscscan.com/api/?txhash=0x651c965d8c9396deccd1128b178ea76f27a4cd8099862a3d941130d9201cf8c0&apiKey=V433U58M7ZWPZ38PMPJS1HVS5AF7S5F9WZ&module=transaction&action=gettxreceiptstatus&req_time=1686466270
    let request = {
      txhash: id,
      apiKey: this.apiKey,
      module: "transaction",
      action: "gettxreceiptstatus",
      req_time: this.seconds(),
    };
    let response = await this.request(
      "",
      "bscscan",
      "GET",
      this.extend(request, params)
    );
    // console.log('response', response)
    let status = this.safeString(response.result && response.result, "status");
    let defi_fee = 0;
    if (status === "1") {
      /* request = {
        txhash: id,
        apiKey: this.apiKey,
        module: "account",
        action: "txlistinternal",
        req_time: this.seconds(),
      };
      response = await this.request(
        "",
        "bscscan",
        "GET",
        this.extend(request, params)
      ); */
      //const gasPrice = this.swapper.getGasPrice();
      defi_fee = await this.swapper.getFee(id);
      //const gasUsed = this.safeString(response.result[0], "gasUsed");
      // const gasUsed = transaction.gasUsed;
      // console.log("defi_fee", defi_fee);
    }
    return {
      id: id,
      status: status === "1" ? "done" : status === "0" ? "rejected" : "open",
      defi_fee,
      info: response,
    };
  }
  parseOrder(response) {
    // Different API endpoints returns order info in different format...
    // with different fields filled.
    return {
      id: response.hash,
      status: response.hash ? "open" : "canceled",
      size: response.size || null,
      price: response.price || null,
      info: response,
    };
  }
  async createOrder(
    product,
    type,
    side,
    amount,
    price = undefined,
    slippage = undefined,
    params = {}
  ) {
    if (type === "market") {
      throw new ExchangeError(this.id + " allows limit orders only");
    }
    try {
      amount = parseFloat(amount).toFixed(6);
      if (amount <= 0) {
        throw new ExchangeError("INSUFFICIENT_FUNDS");
        return;
      }
      if (side === "sell") {
        await this.swapper.init(product, true);
      } else {
        await this.swapper.init(product);
      }
      const trade = await this.swapper.GetTrade(amount, slippage);
      if (!trade) {
        throw new ExchangeError("GetBuyTradeError");
        return;
      }
      const response = await this.swapper.execSwap(trade.inputAmount, trade);
      // console.log('response', response)
      return this.parseOrder(
        this.extend(
          {
            status: "open",
            type: side,
            size: trade.inputAmount.toSignificant(6),
            price: price,
            initialAmount: amount,
          },
          response
        )
      );
    } catch (error) {
      console.error("createOrder Error", error);
      throw new ExchangeError(error.code || error.message || error.body);
    }
  }
  async fetchTicker(product, params = {}) {
    //  console.log('fetchTicker', product)
    let response = await getPool(this.apolloClient, product.id);
    let last =
      response.token0.id === this.baseTokenAddress.toLowerCase()
        ? this.safeNumber(response, "token0Price")
        : this.safeNumber(response, "token1Price");
    return {
      bid: last,
      ask: last,
      dayVolume: 0,
    };
  }
  async fetchPool(product, params = {}) {
    // console.log('fetchPool', tokens)
    let pair = await getPool(
      this.apolloClient,
      product.id,
      product.asset.toLowerCase(),
      product.currency.toLowerCase()
    );
    return pair;
  }
  async fetchTickers(symbols, limit = 1000, params = {}) {
    symbols = symbols.map((s) => s.id);
    const response = await getPools(this.apolloClient, symbols, limit);
    // console.log("response", response);
    const result = {};
    for (let t = 0; t < response.length; t++) {
      const ticker = response[t];
      const label =
        ticker.token0.id === this.baseTokenAddress.toLowerCase()
          ? ticker.token1.symbol + "/" + ticker.token0.symbol
          : ticker.token0.symbol + "/" + ticker.token1.symbol;
      result[label] = this.parseTicker(ticker);
      // console.log("fetchTickers", label, result[label].bid);
    }

    return result;
  }
  async fetchTrades(opts, params = {}) {
    console.log("implementing...");
  }
  parseTrade(trade, market = undefined) {
    //console.log('trade', trade)
    const timestamp = this.safeTimestamp(trade, "hourStartUnix");
    const price =
      trade.pair.token0.id === this.baseTokenAddress.toLowerCase()
        ? this.safeNumber(trade, "reserve0") /
          this.safeNumber(trade, "reserve1")
        : this.safeNumber(trade, "reserve1") /
          this.safeNumber(trade, "reserve0");
    // const priceString = this.safeNumber(trade, 'reserve1') / this.safeNumber(trade, 'reserve0');
    const amountString = this.safeString(trade, "hourlyVolumeUSD");
    //  const price = this.parseNumber(priceString);
    // console.log('priceString', price, typeof price, this.fromWei(price), this.toWei(price), this.numberToString(price))
    const amount = this.parseNumber(amountString);
    return {
      id: "t" + timestamp,
      timestamp: timestamp,
      datetime: this.iso8601(timestamp),
      type: undefined,
      price: this.numberToString(price),
      amount: amount,
      info: trade,
    };
  }
  async fetchOHLCV(opts, params = {}) {
    const defaultLimit = 100;
    const maxLimit = 1000; //1619136000 1628208000000
    let limit =
      opts.limit === undefined ? defaultLimit : Math.min(opts.limit, maxLimit);
    const since = parseInt(opts.from / 1000);
    let response = await getPoolWithHour(
      this.apolloClient,
      opts.id,
      since,
      limit + 1,
      0
    );
    // console.log("getPoolWithHour", response);
    let pairHourDatas = this.safeValue(response, "poolHourData", {});
    //console.log("pairHourDatas", pairHourDatas[0], pairHourDatas.length);
    return this.parseOHLCVs(pairHourDatas, undefined, since, limit);
  }
  async fetchOHLCV2(opts, params = {}) {
    const defaultLimit = 100;
    const maxLimit = 1000; //1619136000 1628208000000
    let limit =
      opts.limit === undefined ? defaultLimit : Math.min(opts.limit, maxLimit);
    const since = parseInt(opts.from / 1000);
    let response = await getPoolWithDay(
      this.apolloClient,
      opts.id,
      since,
      limit + 1,
      0
    );
    let poolDayDatas = this.safeValue(response, "poolDayData", {});
    //console.log("pairHourDatas", pairHourDatas[0], pairHourDatas.length);
    return poolDayDatas.map((ohlcv) => {
      return [
        this.safeTimestamp(ohlcv, "date"),
        this.safeNumber(ohlcv, "open"),
        this.safeNumber(ohlcv, "high"),
        this.safeNumber(ohlcv, "low"),
        this.safeNumber(ohlcv, "close"),
        this.safeNumber(ohlcv, "volumeUSD"),
      ];
    });
  }
  parseOHLCV(ohlcv) {
    return [
      this.safeTimestamp(ohlcv, "periodStartUnix"),
      this.safeNumber(ohlcv, "open"),
      this.safeNumber(ohlcv, "high"),
      this.safeNumber(ohlcv, "low"),
      this.safeNumber(ohlcv, "close"),
      this.safeNumber(ohlcv, "volumeUSD"),
    ];
  }
};
