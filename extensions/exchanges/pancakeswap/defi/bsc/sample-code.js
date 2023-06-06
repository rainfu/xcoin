async function getTokenInfo(tokenAddress) {
    const PANCAKE_ROUTER_V2 = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
    const PANCAKE_FACTORY_V2 = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
    const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
    const BUSD_ADDRESS = '0xe9e7cea3dedca5984780bafc599bd69add087d56';
    const HTTP_PROVIDER_LINK = 'https://bsc-dataseed1.binance.org:443';
    const PANCAKE_ROUTER_V2_ABI = [
        { "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }], "name": "getAmountsOut", "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }], "stateMutability": "view", "type": "function" }
    ];
    const PANCAKE_FACTORY_V2_ABI = [
        { "constant": true, "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "address", "name": "", "type": "address" }], "name": "getPair", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }
    ];
    const TOKEN_ABI = [
        { "constant": true, "inputs": [{ "name": "", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" },
        { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "", "type": "uint8" }], "payable": false, "stateMutability": "view", "type": "function" },
        { "constant": true, "inputs": [], "name": "name", "outputs": [{ "name": "", "type": "string" }], "payable": false, "stateMutability": "view", "type": "function" },
        { "constant": true, "inputs": [], "name": "symbol", "outputs": [{ "name": "", "type": "string" }], "payable": false, "stateMutability": "view", "type": "function" },
        { "constant": true, "inputs": [], "name": "totalSupply", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" },
        { "constant": true, "inputs": [], "name": "getOwner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" },
        { "constant": true, "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" },
        { "inputs": [], "name": "_owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }
    ];
    const BURN_ADDRESS = '0x000000000000000000000000000000000000dead';
    var web3 = new Web3Eth(new Web3Eth.providers.HttpProvider(HTTP_PROVIDER_LINK));
    var pancakeRouter = new web3.Contract(PANCAKE_ROUTER_V2_ABI, PANCAKE_ROUTER_V2);
    var pancakeFactory = new web3.Contract(PANCAKE_FACTORY_V2_ABI, PANCAKE_FACTORY_V2);
    var tokenContract = new web3.Contract(TOKEN_ABI, tokenAddress);

    var WBNB_BUSDPair = await pancakeRouter.methods.getAmountsOut((1e18).toString(), [WBNB_ADDRESS, BUSD_ADDRESS]).call();
    var bnbPrice = parseFloat(WBNB_BUSDPair[1] / 1e18);
    console.log("1 BNB = " + bnbPrice + " USD");

    var token = {
        name: await tokenContract.methods.name().call(),
        decimals: Number(await tokenContract.methods.decimals().call()),
        symbol: await tokenContract.methods.symbol().call(),
        ownerAddress: '',
        lpAddress: '',
        price: {},
        marketCap: {}
    };

    token.totalSupply = Number(await tokenContract.methods.totalSupply().call()) / 10 ** token.decimals;
    token.burnAmount = Number(await tokenContract.methods.balanceOf(BURN_ADDRESS).call()) / 10 ** token.decimals;
    token.circulatingSupply = token.totalSupply - token.burnAmount;

    // Try get owner address
    try {
        token.ownerAddress = await tokenContract.methods.getOwner().call();
    } catch {
        try {
            token.ownerAddress = await tokenContract.methods.owner().call();
        } catch {
            try {
                token.ownerAddress = await tokenContract.methods._owner().call();
            } catch {
                console.log("Contract did not renouce owner.");
            }
        }
    }
    token.ownerAddress = token.ownerAddress.toLowerCase();

    var amountOutBnb = [0, 0];
    try {
        token.lpAddress = await pancakeFactory.methods.getPair(tokenAddress, WBNB_ADDRESS).call();
        token.lpAddress = token.lpAddress.toLowerCase();
        amountOutBnb = await pancakeRouter.methods.getAmountsOut((10 ** token.decimals).toString(), [tokenAddress, WBNB_ADDRESS]).call();
    } catch (e) {
        console.log("Not found pair " + token.symbol + "-BNB on PancakeSwap.");
    }
    token.price.bnb = parseFloat(amountOutBnb[1]) / 1e18;
    token.price.usd = token.price.bnb * bnbPrice;
    token.marketCap.bnb = token.price.bnb * token.circulatingSupply;
    token.marketCap.usd = token.price.usd * token.circulatingSupply;

    console.log(token);
    return token;
}

const getTokenInfo = async (input) => {
    var output = input;
    const { data } = await axios("https://api.bscscan.com/api?module=contract&action=getsourcecode&address=" + input["address"] + "&apikey=" + config.apiKey)
    if (data.status == '1' && data.message == 'OK') {
        output["verified"] = (data.result[0].ABI != "Contract source code not verified");
        output["contract_name"] = data.result[0].ContractName
        output["compiler_version"] = data.result[0].CompilerVersion.split("+")[0]
    } else {
        console.log(data);
    }
    const url = "https://bscscan.com/token/" + input["address"];
    const res = await axios(url);
    const $ = cheerio.load(res.data);
    output["total_supply"] = parseFloat($(".card-body .hash-tag.text-truncate").text().split(",").join(""));
    output["holders"] = parseInt($("#ContentPlaceHolder1_tr_tokenHolders .mr-3").text().split(",").join(""));
    console.log(output);
    return output;
}

const getTokenInfo = async (input) => {
    var output = input;
    const { data } = await axios("https://api.bscscan.com/api?module=contract&action=getsourcecode&address=" + input["address"] + "&apikey=" + config.apiKey)
    if (data.status == '1' && data.message == 'OK') {
        output["verified"] = (data.result[0].ABI != "Contract source code not verified");
        output["contract_name"] = data.result[0].ContractName
        output["compiler_version"] = data.result[0].CompilerVersion.split("+")[0]
    } else {
        console.log(data);
    }
    const url = "https://bscscan.com/token/" + input["address"];
    const res = await axios(url);
    const $ = cheerio.load(res.data);
    output["total_supply"] = parseFloat($(".card-body .hash-tag.text-truncate").text().split(",").join(""));
    output["holders"] = parseInt($("#ContentPlaceHolder1_tr_tokenHolders .mr-3").text().split(",").join(""));
    // console.log(output);
    return output;
}

const getTokenAddresses = async (keyword) => {
    var res = await axios("https://bscscan.com/searchHandler?term=" + keyword + "&filterby=0");

    return res.data.map(row => {
        if (match = row.match(/0x[0-9a-fA-F]{40}/g)) {
            return match[0];
        } else return null
    }).filter(row => row != null);
}

const isLowerVersion = (v1, v2) => {
    str1 = v1.toLowerCase();
    str2 = v2.toLowerCase();
    if (str1.substring(0, 1) == 'v') str1 = str1.substring(1);
    if (str2.substring(0, 1) == 'v') str2 = str2.substring(1);
    str1 = str1.split(".");
    str2 = str2.split(".");
    for (i = 0; i < 3; i++) {
        if (str1[i] > str2[i]) return false;
    }
    return true;
}

const scan = async (keyword) => {
    console.log(`keyword search: ${keyword}`);
    const addresses = await getTokenAddresses(keyword);
    const client = new graphqlClient.GraphQLClient("https://graphql.bitquery.io", { headers: {} })

    ql_result = await client.request(query1, {
        "network": "bsc",
        "address": addresses
    });
    ql_result = ql_result.ethereum.address
    print_data = ql_result.map(data => {
        return { address: data.address, contract_type: data.smartContract?.contractType, token_name: data.smartContract?.currency?.name };
    });
    const new_addresses = print_data.filter(row => row.token_name != undefined).map(row => row.address);
    ql_result = await client.request(query2, {
        "network": "bsc",
        "address": new_addresses
    });
    ql_result = ql_result.ethereum.transfers;
    var transfers = {};
    ql_result.map(row => {
        transfers[row.currency.address] = row.count;
    })
    print_data = print_data.map(row => {
        return { ...row, transfers: transfers[row.address] }
    })
    // print_data.splice(10);
    console.table(print_data);

    console.log("getting details by address");
    const bar2 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar2.start(print_data.length, 0);
    for (var i = 0; i < print_data.length; i++) {
        find_ele = load_data.find((row) => {
            return row.address == print_data[i].address;
        });
        if (find_ele) print_data[i] = find_ele;
        else print_data[i] = await getTokenInfo(print_data[i]);
        bar2.update(i + 1);
    }
    bar2.stop();
    console.table(print_data);
    fs.writeFile("save.json", JSON.stringify(print_data), (err) => {
        if (err) console.log(err);
        console.log("Successfully Written to File.");
    });
    const filtered_data = print_data.filter(row => {
        if (config.keyword && row.token_name?.toLowerCase().indexOf(config.keyword?.toLowerCase()) == -1) return false;
        if (config.totalSupply && row.total_supply != config.totalSupply) return false;
        if (config.maxHolders && row.holders > config.maxHolders) return false;
        if (config.maxTransfers && row.transfers > config.maxTransfers) return false;
        if (config.compilerVersion && isLowerVersion(row.compiler_version, config.compilerVersion)) return false;
        return true;
    })
    console.table(filtered_data);
}

// console.log(isLowerVersion('V1.2', ''));
fs.readFile("save.json", function (err, buf) {
    if (buf.toString()) {
        load_data = JSON.parse(buf.toString());
    }
    else {
        load_data = [];
    }
});
scan(config.keyword);