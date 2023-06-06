"use strict";

//  ---------------------------------------------------------------------------

const ccxt = require("ccxt");
const Exchange = ccxt.Exchange;
const ExchangeError = ccxt.ExchangeError;
const { Swapper } = require("./defi/Swapper");
const {
  ApolloClient,
  InMemoryCache,
  useQuery,
  gql,
  HttpLink,
} = require("@apollo/client");
const { fetch } = require("cross-fetch");
const {
  getToken,
  getPair,
  getPairArray,
  getPairHourData,
  getTokenExtraInfo,
  getProducts,
  getPairArrayDaylyData,
} = require("./defi/PanQuery");
const tb = require("timebucket");
const readline = require("readline");
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
      urls: {
        logo: "https://user-images.githubusercontent.com/51840849/87182086-1cd4cd00-c2ec-11ea-9ec4-d0cf2a2abf62.jpg",
        api: {
          bscscan: "https://api.bscscan.com/api",
          public: "https://api.pancakeswap.com",
          files: "https://files.pancakeswap.com",
          charts: "https://graph.pancakeswap.com",
        },
        www: "https://pancakeswap.com",
        doc: "https://pancakeswap.com/api",
      },
      requiredCredentials: {
        apiKey: false,
        secret: false,
      },
      api: {
        files: {
          get: ["generated/stats/global.json"],
        },
        graphs: {
          get: ["currencies/{name}/"],
        },
        public: {
          get: ["ticker/", "ticker/{id}/", "global/"],
        },
      },
    });
  }
  constructor(userConfig = {}) {
    super(userConfig);
    this.swapper = new Swapper(this.options);
    this.baseTokenAddress = this.options.address.wbnb.toLowerCase();
    this.apolloClient = new ApolloClient({
      link: new HttpLink({ uri: this.options.graphql3, fetch }),
      cache: new InMemoryCache(),
      shouldBatch: true,
    });
  }
  async fetchOrderBook(symbol, limit = undefined, params = {}) {
    throw new ExchangeError(
      "Fetching order books is not supported by the API of " + this.id
    );
  }
  async fetchToken(opts, params = {}) {
    let res;
    res = await getToken(
      this.apolloClient,
      opts.token,
      this.options.api.bscscan,
      true,
      true
    );
    console.log("getTokenExtraInfo ok", res);
    return res;
  }
  async fetchMarkets(opts, params = {}) {
    let since = opts.since || 30;
    let baseTokenAddress = opts.baseTokenAddress || this.baseTokenAddress;
    let minHolders = opts.minHolders || 1500;
    let limit = opts.limit || 100;
    let minVolumeUSD = opts.minVolumeUSD || 100000;
    let minReserveUSD = opts.minReserveUSD || 100000;
    let minTotalTransactions = opts.minTotalTransactions || 1000;
    //  console.log('fetchMarkets', baseTokenAddress, since, minHolders, limit, minVolumeUSD, minReserveUSD, minTotalTransactions)
    if (since) {
      const query_start = tb().resize("1d").subtract(since).toMilliseconds();
      // console.log('init since..', (new Date()).getTime(), since, query_start)
      since = query_start / 1000;
    }
    const pairs = await getProducts(
      this.apolloClient,
      "new",
      baseTokenAddress,
      since,
      limit,
      minVolumeUSD,
      minReserveUSD,
      minTotalTransactions
    );
    console.log("fetchMarkets get pairs ok", pairs.length);
    // console.log('fetchMarkets', response)
    // console.log('fetchMarkets', pairs)
    const result = [];
    let base, quote, decimals, name, price;
    for (let i = 0; i < pairs.length; i++) {
      const market = pairs[i];
      if (market.token0.id === baseTokenAddress) {
        base = market.token1.id;
        decimals = parseInt(market.token1.decimals) || 18;
        quote = market.token0.id;
        name = market.token1.symbol + "/" + market.token0.symbol;
        price = market.token0Price;
      } else {
        base = market.token0.id;
        decimals = parseInt(market.token0.decimals) || 18;
        quote = market.token1.id;
        name = market.token0.symbol + "/" + market.token1.symbol;
        price = market.token1Price;
      }
      let symbol = {
        id: market.id,
        name: name,
        base: base,
        quote: quote,
        active: true,
        decimals: decimals,
        price: price,
        reserveUSD: market.reserveUSD,
        created: this.iso8601(1000 * market.timestamp),
      };
      symbol = await getTokenExtraInfo(null, symbol, this.options.api.bscscan);
      readline.clearLine(process.stdout);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(
        (
          "fetchMarkets " +
          (symbol.symbol ? symbol.symbol : symbol.base) +
          " " +
          i +
          "/" +
          pairs.length
        ).green
      );
      symbol.info = market;
      // console.log('symbol', symbol)
      if (!symbol.holders || (symbol.holders && symbol.holders > minHolders)) {
        result.push(symbol);
      }
    }
    //console.log('result', result)//mi 0xcfbb1bfa710cb2eba070cc3bec0c35226fea4baf feg 0xacFC95585D80Ab62f67A14C566C1b7a49Fe91167
    //const res2 = await getTokenData(this.apolloClient, '0x9da5d475a090f7127628b18887a330a838c6f8ab'.toLowerCase())
    //console.log('res2', JSON.stringify(res2, null, 2))
    return result;
  }

  parseTicker(ticker, pairDayData, market = undefined) {
    /* let timestamp = this.safeTimestamp(ticker, 'timestamp');
        if (timestamp === undefined) {
            timestamp = this.milliseconds();
        } */
    let timestamp = this.milliseconds();
    let id = this.safeString(ticker, "id");

    let last = this.numberToString(
      ticker.token0.id === this.baseTokenAddress.toLowerCase()
        ? this.safeString(ticker, "token0Price")
        : this.safeString(ticker, "token1Price")
    );
    let volume = this.safeString(ticker, "reserveUSD");
    let hourData = this.safeValue(ticker, "pairHourData");
    // console.log('hourData', hourData)
    let hourVolume = "0";
    if (hourData && hourData.length) {
      hourVolume = this.safeString(hourData[0], "hourlyVolumeUSD");
    }
    let dayVolume = "0";
    if (pairDayData) {
      dayVolume = this.safeString(pairDayData, "dailyVolumeUSD");
    }
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
      url = this.urls["api"][api] + "/" + this.implodeParams(path, params);
    } else {
      url =
        this.urls["api"][api] +
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
  async fetchBalance(tokens = null, params = {}) {
    const balance = await this.swapper.getBalances(tokens, params);
    return balance;
  }
  async fetchOrder(id, params = {}) {
    const request = {
      txhash: id,
      apiKey: this.apiKey,
      module: "transaction",
      action: "gettxreceiptstatus",
      req_time: this.seconds(),
    };
    const response = await this.request(
      "",
      "bscscan",
      "GET",
      this.extend(request, params)
    );
    // console.log('response', response)
    let status = this.safeString(response.result && response.result, "status");
    return {
      id: id,
      status: status === "1" ? "done" : status === "0" ? "rejected" : "open",
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
      // console.log('trade', trade)
      const response = await this.swapper.execSwap(trade.inputAmount, trade);
      // console.log('response', response)
      return this.parseOrder(
        this.extend(
          {
            status: "open",
            type: side,
            size: trade.inputAmount.toSignificant(6),
            price: trade.executionPrice.invert().toSignificant(6),
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
    let response = await getPair(this.apolloClient, product.id);
    // console.log('fetchTicker', response)
    const data = this.safeValue(response, "data", {});
    const pair = this.safeValue(data, "pair", {});
    const pairDayData = this.safeValue(data, "pairDayDatas", {})[0];
    // console.log('fetchTicker', pairDayData, this.iso8601(1000 * pairDayData.date))
    return this.parseTicker(pair, pairDayData);
  }
  async fetchPair(product, params = {}) {
    // console.log('fetchPair', tokens)
    let response = await getPair(
      this.apolloClient,
      product.id,
      product.asset.toLowerCase(),
      product.currency.toLowerCase()
    );
    // console.log('fetchPair', res)
    const data = this.safeValue(response, "data", {});
    const pair = this.safeValue(data, "pair", {});
    // const pairAddress = res.id
    //  res = await getPairHourData(this.apolloClient, pairAddress, 0, 100, 0)
    //  console.log('getPairHourData', res.data.pairHourDatas)
    // res = await getPairDaylyData(this.apolloClient, pairAddress, 0, 100, 0)
    // console.log('getPairDaylyData', res.data.pairDayDatas)
    // res = await getPairTransactions(this.apolloClient, pairAddress, 0, 100, 0)
    //console.log('getPairTransactions', res)
    return pair;
  }
  async fetchPairs(pairAddressArray, params = {}) {
    // console.log('fetchPair', tokens)
    //    pairAddressArray = ['0xea26b78255df2bbc31c1ebf60010d78670185bd0', '0x37908620def1491dd591b5a2d16022a33cdda415']
    let res = await getPairArrayDaylyData(
      this.apolloClient,
      pairAddressArray,
      0,
      5,
      0
    );
    console.log("getPairDaylyData", res.data.pairDayDatas);
    return res;
  }
  async fetchTickers(symbols, limit = 1000, params = {}) {
    symbols = symbols.map((s) => s.id);
    const response = await getPairArray(this.apolloClient, symbols);
    const data = this.safeValue(response, "data", {});
    const pairs = this.safeValue(data, "pairs", {});
    console.log("pairs", pairs);
    const result = {};
    for (let t = 0; t < pairs.length; t++) {
      const ticker = pairs[t];
      const label =
        ticker.token0.id === this.baseTokenAddress.toLowerCase()
          ? ticker.token1.id.toLowerCase() +
            "/" +
            ticker.token0.id.toLowerCase()
          : ticker.token0.id.toLowerCase() +
            "/" +
            ticker.token1.id.toLowerCase();
      result[label] = this.parseTicker(ticker);
    }
    //  console.log('result', result)
    return result;
  }
  async fetchTrades(opts, params = {}) {
    const defaultLimit = 100;
    const maxLimit = 500; //1619136000 1628208000000
    let limit =
      opts.limit === undefined ? defaultLimit : Math.min(opts.limit, maxLimit);
    const since = parseInt(opts.from / 1000);
    // console.log('fetchTrades', since, limit)
    let response = await getPairHourData(
      this.apolloClient,
      opts.id,
      since,
      limit,
      0
    );
    // console.log('getPairHourData', response)
    const data = this.safeValue(response, "data", {});
    let pairHourDatas = this.safeValue(data, "pairHourDatas", {});
    // console.log('pairHourDatas', pairHourDatas[0], pairHourDatas.length)
    return this.parseTrades(pairHourDatas, undefined, since, limit);
    /* const result = {};
        for (let t = 0; t < pairHourDatas.length; t++) {
            const ticker = pairHourDatas[t];
            const symbolLabel = symbol.asset + '/' + symbol.currency;
            result[symbolLabel] = this.parseTicker(ticker);
        }
        return result; */
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
    // console.log('fetchTrades', since, limit)
    let response = await getPairHourData(
      this.apolloClient,
      opts.id,
      since,
      limit,
      0
    );
    // console.log('getPairHourData', response)
    const data = this.safeValue(response, "data", {});
    let pairHourDatas = this.safeValue(data, "pairHourDatas", {});
    //console.log('pairHourDatas', pairHourDatas, pairHourDatas.length)
    return this.parseOHLCVs(pairHourDatas, undefined, since, limit);
  }
  parseOHLCV(ohlcv) {
    const price =
      ohlcv.pair.token0.id === this.baseTokenAddress.toLowerCase()
        ? this.safeNumber(ohlcv, "reserve0") /
          this.safeNumber(ohlcv, "reserve1")
        : this.safeNumber(ohlcv, "reserve1") /
          this.safeNumber(ohlcv, "reserve0");
    const priceStr = this.numberToString(price);
    return [
      this.safeTimestamp(ohlcv, "hourStartUnix"),
      priceStr,
      priceStr,
      priceStr,
      priceStr,
      this.safeNumber(ohlcv, "hourlyVolumeUSD"),
    ];
  }
};
