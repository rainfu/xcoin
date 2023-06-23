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

const getToken = async (
  client,
  tokenAddress,
  url = "",
  apiUrl = "",
  apiKey = "",
  withInfo = true
) => {
  let result, token;
  result = await client.query({
    query: GET_TOKEN,
    variables: {
      tokenAddress,
    },
  });
  token = result.data.token;
  if (withInfo) {
    token = await getTokenExtraInfo(token, null, url, apiUrl, apiKey);
  }
  //console.log('getToken', token)
  return token;
};

const getTokenByAsset = async (
  client,
  asset,
  url = "",
  apiUrl = "",
  apiKey = "",
  withInfo = true
) => {
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
    token = await getTokenExtraInfo(token, null, url, apiUrl, apiKey);
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

const getTokenExtraInfo = async (token, symbol, url, apiUrl, apiKey) => {
  /* console.log(
    "getTokenExtraInfo",
    apiUrl +
      "?module=contract&action=getsourcecode&address=" +
      (token ? token.id : symbol.base) +
      "&apikey=" +
      apiKey
  ); */
  var output = JSON.parse(JSON.stringify(token ? token : symbol));
  var address = token ? token.id : symbol.base;
  const { data } = await axios(
    apiUrl +
      "?module=contract&action=getsourcecode&address=" +
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
  try {
    const link = url + "/token/" + address;
    const res = await axios(link);
    const $ = cheerio.load(res.data);
    if (url.indexOf("etherscan") >= 0) {
      const symbol = $("#ContentPlaceHolder1_hdnSymbol").attr("value") || "";
      output["total_supply"] =
        parseFloat(
          $(".card-body .hash-tag.text-truncate").text().split(",").join("")
        ) || "";
      let holders = $("#ContentPlaceHolder1_tr_tokenHolders")
        .text()
        .replace("Holders", "")
        .replace(/\n/g, "")
        .replace(/\(.*?\)/g, "")
        .replace(/,/g, "")
        .trim();
      output["holders"] = parseInt(holders) || "";
      output["symbol"] = symbol;
      /**
       * 
       * <li><a class='dropdown-item text-truncate' href='https://renq.io/' rel='nofollow' target='_blank' style='max-width: 15rem;'><i class='far fa-link fa-fw dropdown-item-icon me-1.5'></i><span title='https://renq.io/' data-bs-toggle='tooltip' data-bs-trigger='hover'>https://renq.io/</span></a></li><li><hr class='dropdown-divider'></li>
       * <li><a class='dropdown-item' target='_blank' href='https://coinmarketcap.com/currencies/renq-finance/'><img id='cmc_logo' src='/images/cmc_new.svg' class='dark:filter-invert-60 me-1.5' width='14'>CoinMarketCap</a></li><li><a class='dropdown-item' target='_blank' href='https://www.coingecko.com/en/coins/renq-finance/'><img id='coingecko_logo' src='/images/coingecko_new.svg' class='dark:filter-invert-60 me-1.5' width='14'>CoinGecko</a></li><li><hr class='dropdown-divider'></li><li><a class='dropdown-item' href="/cdn-cgi/l/email-protection#d1a2a4a1a1bea3a591a3b4bfa0ffb8be"><i class='far fa-envelope fa-fw dropdown-item-icon me-1.5'></i>E-mail</a></li><li><a class='dropdown-item' rel='nofollow' target='_blank' href='https://medium.com/@renq'><i class='far fa-pen fa-fw dropdown-item-icon me-1.5'></i>Blog</a></li><li><a class='dropdown-item' rel='nofollow' target='_blank' href='https://www.reddit.com/r/renq'><span class='fab fa-reddit-square fa-fw dropdown-item-icon me-1.5'></span>Reddit</a></li><li><a class='dropdown-item' rel='nofollow' target='_blank' href='https://www.facebook.com/renqfinance'><span class='fab fa-facebook-f fa-fw dropdown-item-icon me-1.5'></span>Facebook</a></li><li><a class='dropdown-item' rel='nofollow' target='_blank' href='https://twitter.com/RenQ_Finance'><i class='fab fa-twitter fa-fw dropdown-item-icon me-1.5'></i>Twitter</a></li><li><a class='dropdown-item' rel='nofollow' target='_blank' href='https://github.com/renqfinance'><i class='fab fa-github fa-fw dropdown-item-icon me-1.5'></i>Github</a></li><li><a class='dropdown-item' rel='nofollow' target='_blank' href='https://t.me/renqfinance'><span class='fab fa-telegram fa-fw dropdown-item-icon me-1.5'></span>Telegram</a></li><li><a class='dropdown-item' rel='nofollow' target='_blank' href='https://linkedin.com/company/renqfinance'><span class='fab fa-linkedin fa-fw dropdown-item-icon me-1.5'></span>LinkedIn</a></li><li><a class='dropdown-item' rel='nofollow' target='_blank' href='https://renq.io/whitepaper.pdf'><i class='far fa-pen fa-fw dropdown-item-icon me-1.5'></i>Whitepaper</a></li>

       */
      try {
        output["social"] = {};
        let lis = $("#ContentPlaceHolder1_divSummary .dropdown-menu").first();
        lis.children().each(function (i, elem) {
          let liText = $(elem).text().trim();
          if (i === 0) {
            output["site"] = liText || "";
          } else if (liText) {
            let link = $(elem).children(0).attr("href");
            output["social"][liText] = link;
          }
        });
      } catch (e) {}
      //  output["social"] = $(".list-inline-item a.link-hover-secondary").text() | '';
      // console.log("output etherscan", output);
    } else {
      const symbol =
        $(".card-body .hash-tag.text-truncate").next().text() || "";
      // console.log("xxxxxx", res.data);

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
      output["site"] =
        $("#ContentPlaceHolder1_tr_officialsite_1 a").text() || "";
      output["social"] = {};
      $(".list-inline-item a.link-hover-secondary").each(function (i, elem) {
        let ss = $(this).attr("data-original-title").split(": ");
        if (ss.length) {
          output["social"][ss[0].trim()] = ss[1].trim();
        }
      });
      //  output["social"] = $(".list-inline-item a.link-hover-secondary").text() | '';
    }
  } catch (error) {
    console.log("error", error);
  }
  console.log("getToken".cyan, output.symbol, "ok");
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
