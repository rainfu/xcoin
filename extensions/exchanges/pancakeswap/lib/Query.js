const { gql } = require("@apollo/client/core");
const axios = require("axios");
const cheerio = require("cheerio");

const GET_BUNDLE = gql`
  query getBundle($id: Number!) {
    bundle(id: $id) {
      id
      ethPriceUSD
    }
  }
`;
const GET_TOKEN = gql`
  query gettoken($tokenAddress: String!) {
    token(id: $tokenAddress) {
      id
      name
      poolCount
      symbol
      totalSupply
      txCount
      volume
      volumeUSD
      decimals
      derivedETH
      derivedUSD
    }
  }
`;
const GET_TOKENS = gql`
  query getTokens($tokens: [Bytes]!) {
    tokens(where: { id_in: $tokens }) {
      id
      name
      symbol
      txCount
      volume
      volumeUSD
      totalSupply
    }
  }
`;
const GET_TOKENS_WITH_POOL = gql`
  query getTokensWithPool($tokens: [Bytes]!) {
    tokens(where: { symbol_in: $tokens }) {
      id
      name
      symbol
      txCount
      volume
      volumeUSD
      totalSupply
      whitelistPools(first: 3, orderBy: volumeUSD, orderDirection: desc) {
        id
        token0Price
        token1Price
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
        volumeUSD
      }
    }
  }
`;
const GET_TOKEN_WITH_POOL = gql`
  query getTokenWithPool($tokenAddress: String!) {
    token(id: $tokenAddress) {
      id
      symbol
      name
      txCount
      whitelistPools(first: 3, orderBy: volumeUSD, orderDirection: desc) {
        id
        token0Price
        token1Price
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
        volumeUSD
      }
    }
  }
`;
const GET_RECENT_HOT_TOKENS = gql`
  query getRecentHotTokens($limit: Int!, $since: Int!) {
    tokenDayDatas(
      first: $limit
      orderBy: date
      orderDirection: desc
      where: { date_lt: $since }
    ) {
      id
      close
      date
      priceUSD
      volumeUSD
      token {
        id
        symbol
        decimals
        poolCount
        txCount
        volumeUSD
      }
    }
  }
`;

const GET_POOL = gql`
  query getPool($id: String!) {
    pool(id: $id) {
      id
      createdAtTimestamp
      token0Price
      token1Price
      token0 {
        id
        symbol
      }
      token1 {
        id
        symbol
      }
    }
  }
`;

const GET_POOL_WITH_HOUR = gql`
  query getPoolWithHour($id: String!, $since: Int!, $limit: Int!, $skip: Int!) {
    pool(id: $id) {
      createdAtTimestamp
      poolHourData(
        first: $limit
        sckip: $skip
        orderBy: periodStartUnix
        orderDirection: asc
        where: { periodStartUnix_gte: $since }
      ) {
        high
        low
        open
        close
        token0Price
        token1Price
        volumeUSD
        periodStartUnix
      }
      id
    }
  }
`;

const GET_POOL_WITH_DAY = gql`
  query getPoolWithDay($id: String!, $since: Int!, $limit: Int!, $skip: Int!) {
    pool(id: $id) {
      createdAtTimestamp
      poolDayData(
        first: $limit
        sckip: $skip
        orderBy: date
        orderDirection: asc
        where: { date_gte: $since }
      ) {
        high
        low
        open
        close
        token0Price
        token1Price
        volumeUSD
        date
      }
      id
    }
  }
`;

const GET_POOLS = gql`
  query getpools($pools: [Bytes]!) {
    pools(where: { id_in: $pools }) {
      id
      token0Price
      token1Price
      createdAtTimestamp
      token0 {
        id
        symbol
      }
      token1 {
        id
        symbol
      }
    }
  }
`;
const GET_TOKEN_BY_ASSET = gql`
  query getTokenByAsset($asset: String!) {
    tokens(
      orderBy: volumeUSD
      orderDirection: desc
      where: { symbol: $asset }
    ) {
      id
      symbol
      name
      decimals
      totalSupply
      volumeUSD
      txCount
    }
  }
`;

const getToken = async (client, tokenAddress, apiKey = "", withInfo = true) => {
  let result, token;
  result = await client.query({
    query: GET_TOKEN,
    variables: {
      tokenAddress,
    },
  });
  token = result.data.token;
  if (withInfo) {
    token = await getTokenExtraInfo(token, null, apiKey);
  }
  //console.log('getToken', token)
  return token;
};

const getTokenByAsset = async (client, asset, apiKey = "", withInfo = true) => {
  let result, token;
  result = await client.query({
    query: GET_TOKEN_BY_ASSET,
    variables: {
      asset,
    },
  });
  // console.log("result", result.data.tokens);
  if (!result.data.tokens.length) return null;
  token = result.data.tokens[0];
  if (withInfo) {
    token = await getTokenExtraInfo(token, null, apiKey);
  }
  // console.log("getToken", token);
  return token;
};

const getRecentHotTokens = async (client, since = 0, limit = 1000) => {
  let result = await client.query({
    query: GET_RECENT_HOT_TOKENS,
    variables: {
      limit,
      since,
    },
  });
  return result.data.tokenDayDatas;
};
const getTokens = async (client, tokens) => {
  // console.log("getTokens", pools);
  let result = await client.query({
    query: GET_TOKENS,
    variables: {
      tokens,
    },
    fetchPolicy: "cache-first",
  });
  //console.log("getTokens ok", result);
  return result.data.tokens;
};
const getTokensWithPool = async (client, tokens) => {
  console.log("getTokensWithPool", tokens);
  let result = await client.query({
    query: GET_TOKENS_WITH_POOL,
    variables: {
      tokens,
    },
    fetchPolicy: "cache-first",
  });
  console.log("getTokens ok", result);
  return result.data.tokens;
};
const getTokenWithPool = async (
  client,
  baseTokenAddr = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
  tokenAddress
) => {
  //获得符合条件的交易对
  /*  console.log("getTokenWithPool..", {
    query: GET_TOKEN_WITH_POOL,
    variables: {
      tokenAddress,
    },
  }); */
  let result = await client.query({
    query: GET_TOKEN_WITH_POOL,
    variables: {
      baseTokenAddr,
      tokenAddress,
    },
  });
  return result.data.token;
};

const getTokenExtraInfo = async (token, symbol, apiKey) => {
  /* console.log(
    "getTokenExtraInfo",
    "https://api.bscscan.com/api?module=contract&action=getsourcecode&address=" +
      (token ? token.id : symbol.base) +
      "&apikey=" +
      apiKey
  ); */
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

const getPool = async (client, id, token0, token1) => {
  // id = null, token0 = "0x2170ed0880ac9a755fd29b2688956bd959f933f8", token1 = ""
  // console.log("getPool", id, token0, token1);
  if (id) {
    let result = await client.query({
      query: GET_POOL,
      variables: {
        id,
      },
      fetchPolicy: "network-only",
    });
    //  console.log("result", result);
    return result.data.pool;
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

const getPools = async (client, pools) => {
  // console.log("getPools", pools);
  let result = await client.query({
    query: GET_POOLS,
    variables: {
      pools,
    },
    fetchPolicy: "network-only",
  });
  /* console.log(
    "\ngetPools ok".cyan,
    result.data.pools[3].token1.symbol,
    result.data.pools[3].token0Price 
  );*/
  return result.data.pools;
};

const getBundle = async (client) => {
  let result = await client.query({
    query: GET_BUNDLE,
  });
  return result.data.bundle;
};
const getPoolWithHour = async (client, pair, since, limit, skip = 0) => {
  console.log("getPoolWithHour", pair, since, limit, skip);
  let result = await client.query({
    query: GET_POOL_WITH_HOUR,
    variables: {
      id: pair,
      since,
      limit,
      skip,
    },
    fetchPolicy: "cache-first",
  });
  // console.log("result.", result);
  return result.data.pool;
};

const getPoolWithDay = async (client, pair, since, limit, skip = 0) => {
  // console.log("getPoolWithDay", pair, since, limit, skip);
  let result = await client.query({
    query: GET_POOL_WITH_DAY,
    variables: {
      id: pair,
      since,
      limit,
      skip,
    },
    fetchPolicy: "cache-first",
  });
  return result.data.pool;
};

module.exports = {
  getRecentHotTokens,
  getToken,
  getTokens,
  getTokenWithPool,
  getTokensWithPool,
  getTokenByAsset,
  getTokenExtraInfo,
  getPool,
  getPools,
  getPoolWithHour,
  getPoolWithDay,
  getBundle,
};
