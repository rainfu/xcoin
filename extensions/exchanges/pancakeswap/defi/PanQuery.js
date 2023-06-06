const { gql } = require("@apollo/client/core");
const axios = require("axios");
const cheerio = require("cheerio");

const WBNB_PRICE = (block) => {
  const queryString = block
    ? `
    query bundles {
      bundles(where: { id: 1 } block: {number: ${block}}) {
        id
        bnbPrice
      }
    }
  `
    : ` query bundles {
      bundles(where: { id: 1 }) {
        id
        bnbPrice
      }
    }
  `;
  return gql(queryString);
};

const TokenFields = `
  fragment TokenFields on Token {
    id
    name
    symbol
    decimals
  }
`;

const PairFields = `
  fragment PairFields on Pair {
    id
      name
      token0 {
        id
        symbol
        name
        decimals
        totalLiquidity
        derivedBNB
        derivedUSD
      }
      token1 {
        id
        symbol
        name
        decimals
        totalLiquidity
        derivedBNB
        derivedUSD
      }
      token0Price
      token1Price
      volumeUSD
      timestamp
      reserve0
      reserve1
      reserveBNB
      reserveUSD
      totalTransactions
      totalSupply
  }
`;
const PAIRS_QUERY = gql`
  query pairs($pairs: [Bytes]!) {
    pairs(where: { id_in: $pairs }) {
      id
      name
      token0 {
        id
        symbol
      }
      token1 {
        id
        symbol
      }
      token0Price
      token1Price
      volumeUSD
      timestamp
      reserve0
      reserve1
      reserveBNB
      reserveUSD
      totalTransactions
      totalSupply
    }
  }
`;
const TOKEN_QUERY = gql`
  ${TokenFields}
  query token($tokenAddress: String!) {
    token: token(id: $tokenAddress) {
      ...TokenFields
    }
  }
`;
const getToken = async (
  client,
  tokenAddress,
  apiKey = "",
  withInfo = true,
  withDetail = false
) => {
  let result, token, pair;
  result = await client.query({
    query: TOKEN_QUERY,
    variables: {
      tokenAddress,
    },
  });
  // console.log('token', token)
  token = result.data.token;
  if (withInfo) {
    token = await getTokenExtraInfo(token, null, apiKey);
  }
  if (withDetail) {
    if (result && result.data && result.data.pairs0) {
      let mainPair;
      if (result.data.pairs0.length) {
        mainPair = result.data.pairs0[0];
        if (result.data.pairs1 && result.data.pairs1.length) {
          const s1Pair = result.data.pairs1[0];
          mainPair =
            parseFloat(mainPair.reserveUSD) < parseFloat(s1Pair.reserveUSD)
              ? s1Pair
              : mainPair;
        }
      } else if (result.data.pairs1 && result.data.pairs1.length) {
        mainPair = result.data.pairs1[0];
      }
      pair = (await getPair(client, mainPair.id)).data.pair;
    }
  }
  //console.log('getToken', token)
  return { token, pair };
};

const TOKEN_NEW_QUERY = gql`
  ${PairFields}
  query tokenDayDatas(
    $baseTokenAddr: String!
    $since: Int!
    $limit: Int!
    $minVolumeUSD: Int!
    $minReserveUSD: Int!
    $minTotalTransactions: Int!
  ) {
    pairs0: pairs(
      first: $limit
      orderBy: timestamp
      orderDirection: desc
      where: {
        token1: $baseTokenAddr
        volumeUSD_gt: $minVolumeUSD
        reserveUSD_gt: $minReserveUSD
        timestamp_gt: $since
        totalTransactions_gt: $minTotalTransactions
      }
    ) {
      ...PairFields
    }
    pairs1: pairs(
      first: $limit
      orderBy: timestamp
      orderDirection: desc
      where: {
        token0: $baseTokenAddr
        volumeUSD_gt: $minVolumeUSD
        reserveUSD_gt: $minReserveUSD
        timestamp_gt: $since
        totalTransactions_gt: $minTotalTransactions
      }
    ) {
      ...PairFields
    }
  }
`;
const TOKEN_DAY_DATA_QUERY = gql`
  query tokenDayDatas(
    $tokenAddr: String!
    $since: Int!
    $limit: Int!
    $skip: Int!
  ) {
    tokenDayDatas(
      first: $limit
      skip: $skip
      orderBy: date
      orderDirection: asc
      where: { token: $tokenAddr, date_gte: $since }
    ) {
      id
      date
      priceUSD
      totalLiquidityToken
      totalLiquidityUSD
      totalLiquidityBNB
      dailyVolumeBNB
      dailyVolumeToken
      dailyVolumeUSD
      dailyTxns
    }
  }
`;
const getTokenDaylyData = async (client, tokenAddr, since, limit, skip = 0) => {
  console.log("getTokenDayData", tokenAddr, since, limit, skip);
  let result = await client.query({
    query: TOKEN_DAY_DATA_QUERY,
    variables: {
      tokenAddr,
      since,
      limit,
      skip,
    },
    fetchPolicy: "cache-first",
  });
  return result;
};

const TOKEN_DATA_QUERY = (tokenAddress, block) => {
  const queryString = `
    ${TokenFields}
    query tokens {
      tokens(${
        block ? `block : {number: ${block}}` : ``
      } where: {id:"${tokenAddress}"}) {
        ...TokenFields
      }
      pairs0: pairs(where: {token0: "${tokenAddress}"}, first: 50, orderBy: volumeUSD, orderDirection: desc){
        id
        name
        reserveUSD
      }
      pairs1: pairs(where: {token1: "${tokenAddress}"}, first: 50, orderBy: volumeUSD, orderDirection: desc){
        id
        name
        reserveUSD
      }
    }
  `;
  return gql(queryString);
};

const SEARCH_TOKEN_QUERY = gql`
  query tokens($limit: Int!, $skip: Int!) {
    tokens(first: $limit, skip: $skip) {
      id
      name
      symbol
      totalLiquidity
    }
  }
`;

const getProducts = async (
  client,
  type = "new",
  baseTokenAddr = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
  since = 0,
  limit = 1000,
  minVolumeUSD = 100000,
  minReserveUSD = 100000,
  minTotalTransactions = 1000
) => {
  if (type === "new") {
    //获得符合条件的交易对
    console.log("getProducts..", {
      query: TOKEN_NEW_QUERY,
      variables: {
        baseTokenAddr,
        since,
        limit,
        minVolumeUSD,
        minReserveUSD,
        minTotalTransactions,
      },
    });
    let result = await client.query({
      query: TOKEN_NEW_QUERY,
      variables: {
        baseTokenAddr,
        since,
        limit,
        minVolumeUSD,
        minReserveUSD,
        minTotalTransactions,
      },
    });
    //对交易对按成交量合并
    if (result && result.data && result.data) {
      const pairs = result.data.pairs1.concat(result.data.pairs0);
      // console.log('pairs', pairs)
      /* for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i]
        const token = pair.token0.address === baseTokenAddr ? pair.token1 : pair.token0
        //  console.log('token', token)
        pair.extend = await getTokenExtraInfo(token)
        console.log('pair', pair)

      } */
      return pairs;
    }
    return pairs;
  } else {
  }
  return null;
};

const getTokenData = async (client, tokenAddr, block) => {
  let result = await client.query({
    query: TOKEN_DATA_QUERY(tokenAddr, block),
    fetchPolicy: "cache-first",
  });
  return result;
};

const getTokenExtraInfo = async (token, symbol, apiKey) => {
  // console.log('gggg', token, symbol, "https://api.bscscan.com/api?module=contract&action=getsourcecode&address=" + (token ? token.id : symbol.base) + "&apikey=" + apiKey)
  var output = JSON.parse(JSON.stringify(token ? token : symbol));
  var address = token ? token.id : symbol.base;
  const { data } = await axios(
    "https://api.bscscan.com/api?module=contract&action=getsourcecode&address=" +
      address +
      "&apikey=" +
      apiKey
  );
  try {
    if (data.status == "1" && data.message == "OK") {
      output.verified =
        data.result[0].ABI != "Contract source code not verified";
      output.contract_name = data.result[0].ContractName;
      output.compiler_version = data.result[0].CompilerVersion.split("+")[0];
    } else {
      console.log("error..", data);
    }
  } catch {}
  // console.log('outputoutputoutputoutput', output);
  try {
    const url = "https://bscscan.com/token/" + address;
    const res = await axios(url);
    const $ = cheerio.load(res.data);
    const symbol = $(".card-body .hash-tag.text-truncate").next().text() || "";
    // console.log('xxxxxx', symbol)

    output["total_supply"] =
      parseFloat(
        $(".card-body .hash-tag.text-truncate").text().split(",").join("")
      ) || "";
    output["holders"] =
      parseInt(
        $("#ContentPlaceHolder1_tr_tokenHolders .mr-3")
          .text()
          .split(",")
          .join("")
      ) || "";
    output["symbol"] = symbol;
    output["site"] = $("#ContentPlaceHolder1_tr_officialsite_1 a").text() || "";
    output["social"] = {};
    $(".list-inline-item a.link-hover-secondary").each(function (i, elem) {
      let ss = $(this).attr("data-original-title").split(": ");
      if (ss.length) {
        output["social"][ss[0].trim()] = ss[1].trim();
      }
    });
    //  output["social"] = $(".list-inline-item a.link-hover-secondary").text() | '';
    //  console.log(output);
  } catch (error) {
    console.log("error", error);
  }
  return output;
};

const getTokenFirstPair = async (client, tokenAddr, block) => {
  const result = await getTokenData(client, tokenAddr, block);
  if (result && result.data && result.data.pairs0) {
    let mainPair;
    if (result.data.pairs0.length) {
      mainPair = result.data.pairs0[0];
      if (result.data.pairs1 && result.data.pairs1.length) {
        const s1Pair = result.data.pairs1[0];
        mainPair =
          parseFloat(mainPair.reserveUSD) < parseFloat(s1Pair.reserveUSD)
            ? s1Pair
            : mainPair;
      }
    } else if (result.data.pairs1 && result.data.pairs1.length) {
      mainPair = result.data.pairs1[0];
    }
    const pair = await getPair(client, mainPair.id);
    return pair && pair.data && pair.data.pair;
  }
  return null;
};

const getTokenArray = (symbols, limit = 1000) => {
  let idInString = `[`;
  const rsymbols = symbols.map((symbol) => {
    return `"${symbol.asset.toLowerCase()}"`;
  });
  idInString += rsymbols.join(",");
  idInString += "]";

  let queryString = `
      ${TokenFields}
      query tokens {
         tokens(first: ${limit}, where: {id_in: ${idInString}}) {
          ...TokenFields
        }
      }
      `;
  return gql(queryString);
};

const PAIR_QUERY_BY_TOEKNS = (token0, token1) => {
  let query = "";
  if (token0 && token1) {
    token0 = '"' + token0.toLowerCase() + '"';
    token1 = '"' + token1.toLowerCase() + '"';
    query = `
      {
        pairs(first:1,orderBy: reserveUSD, orderDirection: desc,where:{token0:${token0},token1:${token1}}) {
          id
          reserveUSD
          reserve0
          reserve1
          totalSupply
          token0 {
            id
            name
            symbol
          }
          token1 {
            id
            name
            symbol
          }
        }
      }
   `;
  } else if (token0) {
    token0 = '"' + token0.toLowerCase() + '"';
    query = `
    {
      pairs(first:1,orderBy: reserveUSD, orderDirection: desc,where:{token0:${token0}}) {
        reserveUSD
        reserve0
        reserve1
        totalSupply
        token0 {
          id
          name
          symbol
        }
        token1 {
          id
          name
          symbol
        }
      }
    }
 `;
  } else if (token1) {
    token1 = '"' + token1.toLowerCase() + '"';
    query = `
    {
      pairs(first:1,orderBy: reserveUSD, orderDirection: desc,where:{token1:${token1}}) {
        reserveUSD
        reserve0
        reserve1
        totalSupply
        token0 {
          id
          name
          symbol
        }
        token1 {
          id
          name
          symbol
        }
      }
    }
 `;
  }

  // console.log('query', query)
  return gql(query);
};

const PAIR_QUERY_BUY_ID = (id) => {
  return gql`
      {
        pair(id: "${id.toLowerCase()}") {
          id
          name
          timestamp
          reserveBNB
          reserveUSD
          volumeUSD
          reserve0
          reserve1
          totalSupply
          token0 {
            id
            name
            symbol
          }
          token1 {
            id
            name
            symbol
          }
          token0Price
          token1Price
          pairHourData(first:1,orderBy:hourStartUnix,orderDirection:desc){
            hourStartUnix
            reserveUSD
            hourlyVolumeUSD
          }
        }
        pairDayDatas(first:1,orderBy:date,orderDirection:desc,where:{pairAddress: "${id.toLowerCase()}"}) {
          date
          dailyVolumeUSD
          dailyTxns
        }
      }
   `;
};

const getPair = async (client, id, token0, token1) => {
  // id = null, token0 = "0x2170ed0880ac9a755fd29b2688956bd959f933f8", token1 = ""
  // console.log('getPair', id, token0, token1)
  if (id) {
    let result = await client.query({
      query: PAIR_QUERY_BUY_ID(id),
    });
    return result;
  } else {
    let result = await client.query({
      query: PAIR_QUERY_BY_TOEKNS(token0, token1),
    });
    if (result && result.data && result.data.pairs) {
      return result.data.pairs[0];
    }
    return null;
  }
};

const getPairArray = async (client, pairs) => {
  // console.log('getPairArray', pairs)
  let result = await client.query({
    query: PAIRS_QUERY,
    variables: {
      pairs,
    },
    fetchPolicy: "cache-first",
  });
  // console.log('getPairArray ok', result)
  return result;
};

const getMainPrice = async (client, block) => {
  let result = await client.query({
    query: WBNB_PRICE(block),
  });
  return result;
};

const PAIR_DAY_DATA_QUERY_BY_ADDRESS = gql`
  query pairDayDatas(
    $pairAddress: String!
    $since: Int!
    $limit: Int!
    $skip: Int!
  ) {
    pairDayDatas(
      first: $limit
      skip: $skip
      orderBy: date
      orderDirection: asc
      where: { pairAddress: $pairAddress, date_gte: $since }
    ) {
      id
      date
      dailyVolumeToken0
      dailyVolumeToken1
      dailyVolumeUSD
      reserveUSD
    }
  }
`;

const PAIR_HOUR_DATA_QUERY_BY_ID = gql`
  query pairHourDatas($pair: String!, $since: Int!, $limit: Int!, $skip: Int!) {
    pairHourDatas(
      first: $limit
      skip: $skip
      orderBy: hourStartUnix
      orderDirection: asc
      where: { pair: $pair, hourStartUnix_gte: $since }
    ) {
      id
      pair {
        id
        name
        token0 {
          id
          symbol
        }
        token1 {
          id
          symbol
        }
      }
      hourStartUnix
      hourlyVolumeUSD
      reserve0
      reserve1
      reserveUSD
    }
  }
`;

const PAIR_CURRENT_HOUR_DATA_BY_ID = gql`
  query pairHourDatas($pair: String!) {
    pairHourDatas(
      first: 3
      orderBy: hourStartUnix
      orderDirection: desc
      where: { pair: $pair }
    ) {
      id
      pair {
        id
        name
        token0 {
          id
          symbol
        }
        token1 {
          id
          symbol
        }
      }
      hourStartUnix
      hourlyVolumeUSD
      reserve0
      reserve1
      reserveUSD
    }
  }
`;

const PAIR_DAY_DATA_QUERY_BULK_FUNC = (
  pairAddressArray,
  since,
  limit,
  skip
) => {
  let pairsString = `[`;
  pairAddressArray.map((pair) => {
    return (pairsString += `"${pair}"`);
  });
  pairsString += "]";
  const queryString = `
    query days {
      pairDayDatas(first: ${limit},skip:${skip}, orderBy: date, orderDirection: asc, where: { pairAddress_in: ${pairsString}, date_gt: ${since} }) {
        id
        pairAddress
        date
        dailyVolumeToken0
        dailyVolumeToken1
        dailyVolumeUSD
        totalSupply
        reserveUSD
      }
    } 
`;
  // console.log('queryString', queryString)
  return gql(queryString);
};

const PAIR_DAY_DATA_QUERY_BULK = gql`
  query pairDayDatas(
    $pairAddressArray: Bytes!
    $since: Int!
    $limit: Int!
    $skip: Int!
  ) {
    pairDayDatas(
      first: $limit
      skip: $skip
      orderBy: date
      orderDirection: asc
      where: { pairAddress_in: $pairAddressArray, date_gte: $since }
    ) {
      id
      date
      dailyVolumeToken0
      dailyVolumeToken1
      dailyVolumeUSD
      reserveUSD
    }
  }
`;

const getPairDaylyData = async (
  client,
  pairAddress,
  since,
  limit,
  skip = 0
) => {
  console.log("getPairDaylyData", pairAddress, since, limit, skip);
  let result = await client.query({
    query: PAIR_DAY_DATA_QUERY_BY_ADDRESS,
    variables: {
      pairAddress,
      since,
      limit,
      skip,
    },
    fetchPolicy: "cache-first",
  });
  return result;
};

const getPairHourData = async (client, pair, since, limit, skip = 0) => {
  //console.log('getPairHourData', pair, since, limit, skip)
  let result = await client.query({
    query: PAIR_HOUR_DATA_QUERY_BY_ID,
    variables: {
      pair,
      since,
      limit,
      skip,
    },
    fetchPolicy: "cache-first",
  });
  return result;
};

const getCurrentPairHourData = async (client, pair) => {
  //console.log('getPairHourData', pair, since, limit, skip)
  let result = await client.query({
    query: PAIR_CURRENT_HOUR_DATA_BY_ID,
    variables: {
      pair,
    },
  });
  return result;
};

const getPairArrayDaylyData = async (
  client,
  pairAddresses,
  since,
  limit,
  skip = 0
) => {
  console.log("getPairArrayDaylyData", pairAddresses, since, limit, skip);
  let pairAddressArray = `[`;
  const addrArray = pairAddresses.map((addr) => {
    return `"${addr}"`;
  });
  pairAddressArray += addrArray.join(",");
  pairAddressArray += "]";
  // console.log('pairAddressArray', pairAddressArray)
  let result = await client.query({
    query: PAIR_DAY_DATA_QUERY_BULK_FUNC(pairAddresses, since, limit, skip),
    fetchPolicy: "cache-first",
  });
  // console.log('result', result)
  return result;
};
const USER_TRANSACTIONS = gql`
  query transactions($user: Bytes!) {
    mints(orderBy: timestamp, orderDirection: desc, where: { to: $user }) {
      id
      transaction {
        id
        timestamp
      }
      pair {
        id
        token0 {
          id
          symbol
        }
        token1 {
          id
          symbol
        }
      }
      to
      liquidity
      amount0
      amount1
      amountUSD
    }
    burns(orderBy: timestamp, orderDirection: desc, where: { sender: $user }) {
      id
      transaction {
        id
        timestamp
      }
      pair {
        id
        token0 {
          symbol
        }
        token1 {
          symbol
        }
      }
      sender
      to
      liquidity
      amount0
      amount1
      amountUSD
    }
    swaps(orderBy: timestamp, orderDirection: desc, where: { to: $user }) {
      id
      transaction {
        id
        timestamp
      }
      pair {
        token0 {
          symbol
        }
        token1 {
          symbol
        }
      }
      amount0In
      amount0Out
      amount1In
      amount1Out
      amountUSD
      to
    }
  }
`;
const FILTERED_TRANSACTIONS = gql`
  query ($pair: String!, $since: Int!, $limit: Int!, $skip: Int!) {
    mints(
      first: $limit
      skip: $skip
      where: { pair: $pair, timestamp_gte: $since }
      orderBy: timestamp
      orderDirection: desc
    ) {
      transaction {
        id
        timestamp
      }
      pair {
        token0 {
          id
          symbol
        }
        token1 {
          id
          symbol
        }
      }
      to
      liquidity
      amount0
      amount1
      amountUSD
    }
    burns(
      first: $limit
      skip: $skip
      where: { pair: $pair, timestamp_gte: $since }
      orderBy: timestamp
      orderDirection: desc
    ) {
      transaction {
        id
        timestamp
      }
      pair {
        token0 {
          id
          symbol
        }
        token1 {
          id
          symbol
        }
      }
      sender
      liquidity
      amount0
      amount1
      amountUSD
    }
    swaps(
      first: $limit
      skip: $skip
      where: { pair: $pair, timestamp_gte: $since }
      orderBy: timestamp
      orderDirection: desc
    ) {
      transaction {
        id
        timestamp
      }
      id
      pair {
        token0 {
          id
          symbol
        }
        token1 {
          id
          symbol
        }
      }
      amount0In
      amount0Out
      amount1In
      amount1Out
      amountUSD
      to
    }
  }
`;

const FILTERED_SWAPS = gql`
  query ($pair: String!, $since: Int!, $limit: Int!, $skip: Int!) {
    swaps(
      first: $limit
      skip: $skip
      where: { pair: $pair, timestamp_gte: $since }
      orderBy: timestamp
      orderDirection: asc
    ) {
      transaction {
        id
        timestamp
      }
      id
      pair {
        token0 {
          id
          symbol
        }
        token1 {
          id
          symbol
        }
      }
      amount0In
      amount0Out
      amount1In
      amount1Out
      amountUSD
      to
    }
  }
`;

const getPairTransactions = async (
  client,
  pairAddress,
  since,
  limit,
  skip = 0
) => {
  console.log("getPairTransactions", pairAddress, since, limit, skip);
  let result = await client.query({
    query: FILTERED_TRANSACTIONS,
    variables: {
      pair: pairAddress,
      since,
      limit,
      skip,
    },
    fetchPolicy: "no-cache",
  });
  // console.log('result', result)
  let transactions = {};
  transactions.mints = result.data.mints;
  transactions.burns = result.data.burns;
  transactions.swaps = result.data.swaps;
  return transactions;
};

const getPairSwaps = async (client, pairAddress, since, limit, skip = 0) => {
  console.log("getPairSwaps", pairAddress, since, limit, skip);
  let result = await client.query({
    query: FILTERED_SWAPS,
    variables: {
      pair: pairAddress,
      since,
      limit,
      skip,
    },
    fetchPolicy: "no-cache",
  });
  return result;
};

module.exports = {
  getProducts,
  getMainPrice,
  getToken,
  getTokenData,
  getTokenDaylyData,
  getTokenArray,
  getPair,
  getPairArray,
  getTokenFirstPair,
  getPairDaylyData,
  getPairHourData,
  getPairArrayDaylyData,
  getPairTransactions,
  getPairSwaps,
  getTokenExtraInfo,
  getCurrentPairHourData,
};
