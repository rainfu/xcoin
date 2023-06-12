"use strict";

const ERC20_ABI = require("./abis/ERC20.json");
const IUniswapV2Router02 = require("./abis/IUniswapV2Router02ABI.json");
const { MaxUint256 } = require("@ethersproject/constants");
const { getAddress } = require("@ethersproject/address");
const { parseUnits } = require("@ethersproject/units");
const {
  ETHER,
  Fetcher,
  ChainId,
  Token,
  TokenAmount,
  Route,
  Percent,
  JSBI,
  WETH,
  Trade,
  TradeType,
  Router,
} = require("@pancakeswap/sdk");
const ethers = require("ethers");
const Web3 = require("web3");

class Swapper {
  constructor(options) {
    //  console.log("swapper options", options);
    this.gasPrice = 0;
    this.mainChainId =
      options.chainId === 56 ? ChainId.MAINNET : ChainId.TESTNET;
    const WBNB = WETH[this.mainChainId];
    const CAKE = new Token(
      this.mainChainId,
      "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
      18,
      "CAKE",
      "PancakeSwap Token"
    );
    const DAI = new Token(
      this.mainChainId,
      "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3",
      18,
      "DAI",
      "Dai Stablecoin"
    );
    const BUSD = new Token(
      this.mainChainId,
      "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      18,
      "BUSD",
      "Binance USD"
    );
    const BTCB = new Token(
      this.mainChainId,
      "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
      18,
      "BTCB",
      "Binance BTC"
    );
    const USDT = new Token(
      this.mainChainId,
      "0x55d398326f99059fF775485246999027B3197955",
      18,
      "USDT",
      "Tether USD"
    );
    const UST = new Token(
      this.mainChainId,
      "0x23396cF899Ca06c4472205fC903bDB4de249D6fC",
      18,
      "UST",
      "Wrapped UST Token"
    );
    const ETH = new Token(
      this.mainChainId,
      "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
      18,
      "ETH",
      "Binance-Peg Ethereum Token"
    );
    this.BASE_TOKEN = WBNB;
    this.TRADE_TOKENS = [WBNB, DAI, BUSD, BTCB, USDT, UST, ETH];

    this.tradeOptions = {
      maxHops: 3,
      maxNumResults: 1,
    };
    this.options = options;
    this.web3 = new Web3(options.provider);
    this.activateAccount = this.web3.eth.accounts.privateKeyToAccount(
      options.wallet.key
    );
    this.swapOptions = {
      feeOnTransfer: false,
      allowedSlippage: new Percent(
        JSBI.BigInt(Math.floor(1000)),
        JSBI.BigInt(10000)
      ), //滑动万分之..
      recipient: this.activateAccount.address, //account address
      ttl: 60 * 2,
    };
    this.provider = new ethers.providers.JsonRpcProvider(options.provider);
    //  console.log('this.provider', this.provider)
    this.wallet = new ethers.Wallet(options.wallet.key, this.provider);
    this.accountSwapContract = new ethers.Contract(
      options.address.router,
      IUniswapV2Router02.abi,
      this.provider
    ).connect(this.wallet);
    this.routerContract = new this.web3.eth.Contract(
      IUniswapV2Router02.abi,
      options.address.router
    ); //路由合约
  }
  async init(product, isSell = false) {
    //init contract
    if (!isSell) {
      if (
        product.currency.toLowerCase() === this.BASE_TOKEN.address.toLowerCase()
      ) {
        this.inputToken = this.BASE_TOKEN;
        console.log("input is wbnb");
      } else {
        this.inputToken = new Token(
          this.mainChainId,
          getAddress(product.currency),
          product.decimals
        );
      }
      this.outputToken = new Token(
        this.mainChainId,
        getAddress(product.asset),
        product.decimals,
        product.symbol
      );
    } else {
      this.inputToken = new Token(
        this.mainChainId,
        getAddress(product.asset),
        product.decimals,
        product.symbol
      );
      if (
        product.currency.toLowerCase() === this.BASE_TOKEN.address.toLowerCase()
      ) {
        this.outputToken = this.BASE_TOKEN;
        console.log("output is wbnb");
      } else {
        this.outputToken = new Token(
          this.mainChainId,
          getAddress(product.currency),
          product.decimals
        );
      }
    }
    this.accountContract = new ethers.Contract(
      this.inputToken.address,
      ERC20_ABI,
      this.provider
    );
    this.accountContract = this.accountContract.connect(this.wallet);
    /*  console.log(
      `inputToken loaded:${this.inputToken.chainId} ${this.inputToken.address} / ${this.inputToken.symbol} / ${this.inputToken.decimals}`
    );
    console.log(
      `OutputToken loaded:${this.inputToken.chainId} ${this.outputToken.address} / ${this.outputToken.symbol} / ${this.outputToken.decimals}`
    ); */

    //1.授权output Token交易
    if (this.mainChainId === ChainId.MAINNET) {
      await this.approve(this.inputToken.address, MaxUint256);
      await this.approve(this.outputToken.address, MaxUint256);
    }
    // await this.approve(BUSD.address, MaxUint256) //授权
  }
  async approve(spender, amount) {
    if (this.accountContract.address === spender) {
      // console.warn(`approved: the same token:`, spender);
      return;
    }
    const add = await this.accountContract.allowance(
      this.wallet.address,
      spender
    );
    const apped = ethers.BigNumber.from(add);
    // console.log(this.accountContract.address, spender, 'has approved', add, apped, apped.gt(0))
    if (!apped.gt(0)) {
      const res = await this.accountContract.approve(
        this.options.address.router,
        amount
      ); //授权
      // console.warn(`approved: ${this.options.address.router}`, res)
      await this.accountContract.approve(spender, amount); //授权
      console.warn(`\napproved: ${spender}`, apped.toString());
    }
  }
  //获取账户的现金余额
  async getBalances(tokens) {
    //get all tokens balance
    //https://bscscan.com/tokenholdings?a=0x84ef59061F0a8C8f23875B40716c41F875f2422A
    const walletAddress = await this.wallet.getAddress();
    let balance = {};
    let balanceamount = await this.wallet.getBalance();
    const valB = ethers.utils
      .formatUnits(balanceamount, this.BASE_TOKEN.decimals || 18)
      .toString(); //余额1
    balance[this.BASE_TOKEN.address.toLowerCase()] = {
      free: parseFloat(valB),
      used: 0,
      total: parseFloat(valB),
      info: balanceamount,
    };
    //console.log(this.BASE_TOKEN.address.toLowerCase(), balance[this.BASE_TOKEN.address.toLowerCase()])
    if (tokens && tokens.length) {
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].toLowerCase() === this.BASE_TOKEN.address.toLowerCase()) {
        } else {
          const address = getAddress(tokens[i]);
          const tokenContract = new ethers.Contract(
            address,
            ERC20_ABI,
            this.provider
          );
          const tokenBalance = await tokenContract.balanceOf(walletAddress); ///输出token的金额
          // console.log('outputBalance', tokenBalance)
          const valB = ethers.utils.formatUnits(tokenBalance, 18).toString(); //余额1
          // console.log('response', tokens[i], outputBalance, valB)
          balance[address.toLowerCase()] = {
            free: parseFloat(valB),
            used: 0,
            total: parseFloat(valB),
            info: tokenBalance,
          };
        }
      }
    }
    //console.log("balance", balance);
    return balance;
  }

  tryParseAmount(value, token) {
    // console.log('tryParseAmount', value, token)
    if (!value || !token) {
      return undefined;
    }
    try {
      const typedValueParsed = parseUnits(value, token.decimals).toString();
      //  console.log('typedValueParsed', typedValueParsed)
      if (typedValueParsed !== "0") {
        return new TokenAmount(token, JSBI.BigInt(typedValueParsed));
      }
    } catch (error) {
      // should fail if the user specifies too many decimal places of precision (or maybe exceed max uint?)
      console.info(`Failed to parse input amount: "${value}"`, error);
    }
    // necessary for all paths to return a value
    return undefined;
  }
  getGasPrice() {
    return this.web3.utils.fromWei(this.gasPrice, "ether");
  }
  async getFee(hash) {
    let transaction = await this.web3.eth.getTransactionReceipt(hash);
    // console.log("getTransaction", transaction);
    // return this.web3.utils.fromWei(this.gasPrice, "ether");
    return (
      this.web3.utils.fromWei(String(transaction.gasUsed), "wei") *
      this.web3.utils.fromWei(String(transaction.effectiveGasPrice), "ether")
    );
  }
  async GetTrade(amount, slippage) {
    this.swapOptions.allowedSlippage = new Percent(
      JSBI.BigInt(Math.floor(slippage * 100)),
      JSBI.BigInt(10000)
    );
    const inputTokenAmount = this.tryParseAmount(amount, this.inputToken);
    const pair = await Fetcher.fetchPairData(
      this.inputToken,
      this.outputToken,
      this.provider
    );
    // console.log('pair', pair)
    const route = new Route([pair], this.inputToken);
    //  console.log('route', route)
    //  console.log('midPrice', route.midPrice.toSignificant(6)); // 201.306
    //  console.log('midPrice', route.midPrice.invert().toSignificant(6)); // 0.00496756
    //  console.log('inputTokenAmount', typeof inputTokenAmount, inputTokenAmount)
    const trade = new Trade(route, inputTokenAmount, TradeType.EXACT_INPUT);

    return trade;
  }
  tradeInfo(trade) {
    //console.log('trade', trade)
    const executionPrice = trade.executionPrice.invert().toSignificant(6);
    const nextMidPrice = trade.nextMidPrice.invert().toSignificant(6);
    const outputAmount = trade.outputAmount.toSignificant(6);
    const inputAmount = trade.inputAmount.toSignificant(6);
    const priceImpact = trade.priceImpact.toSignificant(6);
    return {
      executionPrice,
      nextMidPrice,
      outputAmount,
      inputAmount,
      priceImpact,
    };
  }

  async gas(parameters, options) {
    return await this.accountSwapContract.estimateGas[parameters.methodName](
      ...parameters.args,
      options
    );
  }
  isZero(hexNumberString) {
    return /^0x0*$/.test(hexNumberString);
  }
  async execSwap(amount, trade) {
    // this.gasPrice = await this.web3.eth.getGasPrice();
    const startTime = Date.now();
    if (this.inputToken.equals(this.BASE_TOKEN)) {
      trade.inputAmount.currency = ETHER;
    }
    if (this.outputToken.equals(this.BASE_TOKEN)) {
      trade.outputAmount.currency = ETHER;
    }
    const parameters = Router.swapCallParameters(trade, this.swapOptions);
    // console.log("execSwap,parameters", parameters);
    const encoded_tx = this.routerContract.methods[parameters.methodName](
      ...parameters.args
    ).encodeABI();
    amount = ethers.utils.formatEther(parameters.value);
    //console.log("amount", amount);
    const value = parseUnits(amount, trade.inputAmount.decimals);
    // console.log("value", value);

    let transactionObject = {
      gasLimit: 2062883, //gas费用
      // value: value,//转账金额
      data: encoded_tx,
      from: this.activateAccount.address,
      to: this.options.address.router,
      value: value,
    };
    // console.log("execSwap,transactionObject", transactionObject);
    let routeTag = `Swap:[${trade.inputAmount.currency.symbol}->${
      trade.outputAmount.currency.symbol
    }][price=${trade.executionPrice.invert().toSignificant(6)}]`;
    //  console.log('execSwap,routeTag', routeTag)
    let gas = "";
    /* try { */
    const value2 = parameters.value;
    const options = !value2 || this.isZero(value2) ? {} : { value: value2 };
    // console.log("start get gas..", parameters, options);
    gas = await this.gas(parameters, options);
    //  console.log("trade gas..", gas.toNumber());
    /* } catch (e) {
            console.error("gas.error:", e)
        } */
    if (gas) {
      transactionObject.gasLimit = gas.toNumber(); //使用3倍gas费
    }
    const wasteGas = Date.now() - startTime;
    console.log(
      `Start.swap: ${routeTag} | ${
        parameters.methodName
      }, gasLimit:${gas.toString()} / Time:${wasteGas}ms,value: ${ethers.utils
        .formatUnits(value, trade.inputAmount.decimals)
        .toString()}`
    );
    const res = await this.wallet.sendTransaction(transactionObject);
    /* console.log("swap res", res);

    const receipt = await res.wait(); //等待区块确认
    const transTime = Date.now() - startTime;
    console.log(
      "swap receipt",
      receipt.gasUsed.toString(),
      receipt.cumulativeGasUsed.toString(),
      receipt.effectiveGasPrice.toString()
    );
    if (receipt.status) {
      console.info(
        `Transaction.success: ${routeTag} gasUsed:${receipt.gasUsed.toString()},time:${transTime}ms,confirmations:${
          receipt.confirmations
        }`
      );
    } else {
      console.error("Swap.error:", receipt);
    } */
    return {
      hash: res.hash /*,
            trade ,
            tradeRes: res */,
    };
  }
  printTrade(tag, amount, trade) {
    const info = this.tradeInfo(trade);
    const old = { ...this.cached };
    this.cached.route = SwapRoutePrint(trade).join("->");
    this.cached.price = info.executionPrice;
    if (this.cached.route != old.route || this.cached.price != old.price) {
      logger.warn(
        `[${tag}]Route.stateChange: ${SwapRoutePrint(trade).join(
          "->"
        )} / Price:${info.executionPrice},Input:${info.inputAmount},Output:${
          info.outputAmount
        }`
      );
    }
    return info;
  }
}

module.exports = {
  Swapper,
};
