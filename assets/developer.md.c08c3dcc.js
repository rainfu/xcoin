import{_ as e,c as t,o as a,N as n}from"./chunks/framework.9a843496.js";const u=JSON.parse('{"title":"Developer","description":"","frontmatter":{},"headers":[],"relativePath":"developer.md","lastUpdated":1681188290000}'),s={name:"developer.md"},i=n('<h1 id="developer" tabindex="-1">Developer <a class="header-anchor" href="#developer" aria-label="Permalink to &quot;Developer&quot;">​</a></h1><p>XCoin provides some basic extensions to enhance functions, and developers can also develop more functions through extension modules.</p><h2 id="api-extensions-extensions-output" tabindex="-1">API extensions /extensions/output <a class="header-anchor" href="#api-extensions-extensions-output" aria-label="Permalink to &quot;API extensions /extensions/output&quot;">​</a></h2><p>The relevant codes for connecting XCoin to the client are provided. At present, XCoin only supports APIs matching <a href="https://github.com/markmind/panacea-api" target="_blank" rel="noreferrer">Panacea</a>. Panacea is a full-platform (ANDROID, IOS, WINDOWS, MAC, LINUX) trading bot real-time status management application, which is highly compatible with XCoin Integration, can provide interfaces for all configurations, strategies, and real-time trading.</p><p>You can get more help at <a href="./api">API</a></p><h2 id="exchange-extensions-extensions-exchanges" tabindex="-1">Exchange Extensions /extensions/exchanges <a class="header-anchor" href="#exchange-extensions-extensions-exchanges" aria-label="Permalink to &quot;Exchange Extensions /extensions/exchanges&quot;">​</a></h2><p>The exchange extension provides the data source for the bot to trade. By default, the extension provided by ccxt is used. ccxt provides a large number of exchange data interfaces. If you need to develop an exchange-specific interface, you can create it under extensions Own exchange interface.</p><p>The sim exchange is the main interface for simulated trading, including paper and sim. The former uses real exchange data for simulated trading, and the latter uses historical data for backtesting transactions.</p><p>You can get more help at <a href="./exchange">exchangse</a></p><h2 id="strategy-extensions-extensions-strategies" tabindex="-1">Strategy Extensions /extensions/strategies <a class="header-anchor" href="#strategy-extensions-extensions-strategies" aria-label="Permalink to &quot;Strategy Extensions /extensions/strategies&quot;">​</a></h2><p>Strategy extension provides the base class strategy.js and built-in strategy based on strategy extension</p><h2 id="strategy-extensions-extensions-strategies-list" tabindex="-1">Strategy extensions /extensions/strategies/list <a class="header-anchor" href="#strategy-extensions-extensions-strategies-list" aria-label="Permalink to &quot;Strategy extensions /extensions/strategies/list&quot;">​</a></h2><p>The built-in strategy list includes four separate strategies including RSI and a compound strategy. You may easily obtain new strategies by combining json files</p><p>You can get more help with <a href="./strategy">Trading Strategies</a></p>',14),o=[i];function r(c,l,h,d,p,g){return a(),t("div",null,o)}const f=e(s,[["render",r]]);export{u as __pageData,f as default};