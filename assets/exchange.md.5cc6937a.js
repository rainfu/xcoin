import{_ as s,c as a,o as n,N as e}from"./chunks/framework.9a843496.js";const d=JSON.parse('{"title":"Exchange","description":"","frontmatter":{},"headers":[],"relativePath":"exchange.md","lastUpdated":1687579715000}'),o={name:"exchange.md"},l=e(`<h1 id="exchange" tabindex="-1">Exchange <a class="header-anchor" href="#exchange" aria-label="Permalink to &quot;Exchange&quot;">​</a></h1><p>XCoin supports all exchanges supported by <a href="https://github.com/ccxt/ccxt" target="_blank" rel="noreferrer">ccxt</a> (more than 100 types), and through the packaging of ccxt/exchange.js, it can handle almost all data required for transactions. Currently we have Binance, BinanceUSDM, and Mexc have passed the test. You can also try other exchanges such as OKEX, HuoBi, etc.</p><p>At the same time, when simulating or backtesting transactions, XCoin supports obtaining historical or real-time data through sim/exchange.js to complete the simulation or backtest transaction process</p><p>We are also considering adding a DEFI type exchange based on pancakswap, so stay tuned.</p><h2 id="introduction" tabindex="-1">Introduction <a class="header-anchor" href="#introduction" aria-label="Permalink to &quot;Introduction&quot;">​</a></h2><h3 id="ccxt" tabindex="-1">ccxt <a class="header-anchor" href="#ccxt" aria-label="Permalink to &quot;ccxt&quot;">​</a></h3><p>Supports nearly a hundred mainstream exchanges that obtain data through the <a href="https://github.com/ccxt/ccxt" target="_blank" rel="noreferrer">ccxt</a> module. Through the api key provided by the user, the exchange can pass through three modes: anonymous, user authentication, and websocket authentication Get the data, you can call it conveniently as needed</p><h3 id="defi" tabindex="-1">Defi <a class="header-anchor" href="#defi" aria-label="Permalink to &quot;Defi&quot;">​</a></h3><p>Support Defi exchanges such as <a href="https://www.pancakeswap.finance" target="_blank" rel="noreferrer">pancakeswap</a> And <a href="https://www.uniswap.org" target="_blank" rel="noreferrer">uniswap</a>. Support real-time automatic addition of new active tokens. You can also easily expand other defi exchanges as needed</p><h3 id="sim" tabindex="-1">sim <a class="header-anchor" href="#sim" aria-label="Permalink to &quot;sim&quot;">​</a></h3><p>Simulated exchange, used to support simulated and backtested transactions</p><h2 id="add-new-exchange" tabindex="-1">Add new exchange <a class="header-anchor" href="#add-new-exchange" aria-label="Permalink to &quot;Add new exchange&quot;">​</a></h2><p>XCoin initializes the exchange through the following methods</p><div class="language-javascript"><button title="Copy Code" class="copy"></button><span class="lang">javascript</span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#89DDFF;font-style:italic;">try</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">{</span></span>
<span class="line"><span style="color:#F07178;">       </span><span style="color:#89DDFF;font-style:italic;">if</span><span style="color:#F07178;"> (</span><span style="color:#A6ACCD;">so</span><span style="color:#89DDFF;">.</span><span style="color:#F07178;"> </span><span style="color:#A6ACCD;">mode</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">!==</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">&#39;</span><span style="color:#C3E88D;">live</span><span style="color:#89DDFF;">&#39;</span><span style="color:#F07178;">) </span><span style="color:#89DDFF;">{</span></span>
<span class="line"><span style="color:#F07178;">         </span><span style="color:#A6ACCD;">s</span><span style="color:#89DDFF;">.</span><span style="color:#A6ACCD;">exchange</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">=</span><span style="color:#F07178;"> </span><span style="color:#82AAFF;">require</span><span style="color:#F07178;">(</span><span style="color:#A6ACCD;">path</span><span style="color:#89DDFF;">.</span><span style="color:#82AAFF;">resolve</span><span style="color:#F07178;">(</span><span style="color:#A6ACCD;">__dirname</span><span style="color:#89DDFF;">,</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">&#39;</span><span style="color:#C3E88D;">../extensions/exchanges/sim/exchange</span><span style="color:#89DDFF;">&#39;</span><span style="color:#F07178;">))(</span><span style="color:#A6ACCD;">conf</span><span style="color:#89DDFF;">,</span><span style="color:#F07178;"> </span><span style="color:#A6ACCD;">so</span><span style="color:#89DDFF;">,</span><span style="color:#F07178;"> </span><span style="color:#A6ACCD;">s</span><span style="color:#F07178;">)</span></span>
<span class="line"><span style="color:#F07178;">       </span><span style="color:#89DDFF;">}</span></span>
<span class="line"><span style="color:#F07178;">       </span><span style="color:#89DDFF;font-style:italic;">else</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">{</span></span>
<span class="line"><span style="color:#F07178;">         </span><span style="color:#A6ACCD;">s</span><span style="color:#89DDFF;">.</span><span style="color:#A6ACCD;">exchange</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">=</span><span style="color:#F07178;"> </span><span style="color:#82AAFF;">require</span><span style="color:#F07178;">(</span><span style="color:#A6ACCD;">path</span><span style="color:#89DDFF;">.</span><span style="color:#82AAFF;">resolve</span><span style="color:#F07178;">(</span><span style="color:#A6ACCD;">__dirname</span><span style="color:#89DDFF;">,</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">\`</span><span style="color:#C3E88D;">../extensions/exchanges/</span><span style="color:#89DDFF;">\${</span><span style="color:#A6ACCD;">so</span><span style="color:#89DDFF;">.</span><span style="color:#A6ACCD;">exchange</span><span style="color:#89DDFF;">}</span><span style="color:#C3E88D;">/exchange</span><span style="color:#89DDFF;">\`</span><span style="color:#F07178;">))(</span><span style="color:#A6ACCD;">conf</span><span style="color:#89DDFF;">,</span><span style="color:#F07178;"> </span><span style="color:#A6ACCD;">so</span><span style="color:#F07178;">)</span></span>
<span class="line"><span style="color:#F07178;">       </span><span style="color:#89DDFF;">}</span></span>
<span class="line"><span style="color:#F07178;">     </span><span style="color:#89DDFF;">}</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;font-style:italic;">catch</span><span style="color:#A6ACCD;"> (e) </span><span style="color:#89DDFF;">{</span></span>
<span class="line"><span style="color:#F07178;">      </span><span style="color:#89DDFF;font-style:italic;">if</span><span style="color:#F07178;"> (</span><span style="color:#A6ACCD;">so</span><span style="color:#89DDFF;">.</span><span style="color:#A6ACCD;">defi</span><span style="color:#F07178;">) </span><span style="color:#89DDFF;">{</span></span>
<span class="line"><span style="color:#F07178;">        </span><span style="color:#A6ACCD;">s</span><span style="color:#89DDFF;">.</span><span style="color:#A6ACCD;">exchange</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">=</span><span style="color:#F07178;"> </span><span style="color:#82AAFF;">require</span><span style="color:#F07178;">(</span><span style="color:#A6ACCD;">path</span><span style="color:#89DDFF;">.</span><span style="color:#82AAFF;">resolve</span><span style="color:#F07178;">(</span></span>
<span class="line"><span style="color:#F07178;">          </span><span style="color:#A6ACCD;">__dirname</span><span style="color:#89DDFF;">,</span></span>
<span class="line"><span style="color:#F07178;">          </span><span style="color:#89DDFF;">&quot;</span><span style="color:#C3E88D;">../extensions/exchanges/defi/exchange</span><span style="color:#89DDFF;">&quot;</span></span>
<span class="line"><span style="color:#F07178;">        ))(</span><span style="color:#A6ACCD;">conf</span><span style="color:#89DDFF;">,</span><span style="color:#F07178;"> </span><span style="color:#A6ACCD;">so</span><span style="color:#F07178;">)</span><span style="color:#89DDFF;">;</span></span>
<span class="line"><span style="color:#F07178;">      </span><span style="color:#89DDFF;">}</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;font-style:italic;">else</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">{</span></span>
<span class="line"><span style="color:#F07178;">       </span><span style="color:#89DDFF;font-style:italic;">if</span><span style="color:#F07178;"> (</span><span style="color:#A6ACCD;">so</span><span style="color:#89DDFF;">.</span><span style="color:#A6ACCD;">defi</span><span style="color:#F07178;">) </span><span style="color:#89DDFF;">{</span></span>
<span class="line"><span style="color:#F07178;">          </span><span style="color:#A6ACCD;">s</span><span style="color:#89DDFF;">.</span><span style="color:#A6ACCD;">exchange</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">=</span><span style="color:#F07178;"> </span><span style="color:#82AAFF;">require</span><span style="color:#F07178;">(</span><span style="color:#A6ACCD;">path</span><span style="color:#89DDFF;">.</span><span style="color:#82AAFF;">resolve</span><span style="color:#F07178;">(</span></span>
<span class="line"><span style="color:#F07178;">            </span><span style="color:#A6ACCD;">__dirname</span><span style="color:#89DDFF;">,</span></span>
<span class="line"><span style="color:#F07178;">            </span><span style="color:#89DDFF;">&quot;</span><span style="color:#C3E88D;">../extensions/exchanges/defi/exchange</span><span style="color:#89DDFF;">&quot;</span></span>
<span class="line"><span style="color:#F07178;">          ))(</span><span style="color:#A6ACCD;">conf</span><span style="color:#89DDFF;">,</span><span style="color:#F07178;"> </span><span style="color:#A6ACCD;">so</span><span style="color:#F07178;">)</span><span style="color:#89DDFF;">;</span></span>
<span class="line"><span style="color:#F07178;">        </span><span style="color:#89DDFF;">}</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;font-style:italic;">else</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">{</span></span>
<span class="line"><span style="color:#F07178;">          </span><span style="color:#A6ACCD;">s</span><span style="color:#89DDFF;">.</span><span style="color:#A6ACCD;">exchange</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">=</span><span style="color:#F07178;"> </span><span style="color:#82AAFF;">require</span><span style="color:#F07178;">(</span><span style="color:#A6ACCD;">path</span><span style="color:#89DDFF;">.</span><span style="color:#82AAFF;">resolve</span><span style="color:#F07178;">(</span></span>
<span class="line"><span style="color:#F07178;">            </span><span style="color:#A6ACCD;">__dirname</span><span style="color:#89DDFF;">,</span></span>
<span class="line"><span style="color:#F07178;">            </span><span style="color:#89DDFF;">&quot;</span><span style="color:#C3E88D;">../extensions/exchanges/ccxt/exchange</span><span style="color:#89DDFF;">&quot;</span></span>
<span class="line"><span style="color:#F07178;">          ))(</span><span style="color:#A6ACCD;">conf</span><span style="color:#89DDFF;">,</span><span style="color:#F07178;"> </span><span style="color:#A6ACCD;">so</span><span style="color:#F07178;">)</span><span style="color:#89DDFF;">;</span></span>
<span class="line"><span style="color:#F07178;">        </span><span style="color:#89DDFF;">}</span></span>
<span class="line"><span style="color:#F07178;">      </span><span style="color:#89DDFF;">}</span></span>
<span class="line"><span style="color:#F07178;">     </span><span style="color:#89DDFF;">}</span></span></code></pre></div><p>If ccxt/exchange.js does not meet your requirements, you can add a new exchange name under extensions/exchange and add the exchange.js file under exchanges</p><ul><li><p>If the exchange is based on ccxt, you only need to adjust the details part</p></li><li><p>If the exchange is based on other APIs, you need to implement the necessary functions provided by the CCXT exchange</p></li></ul>`,16),p=[l];function t(c,r,F,y,D,i){return n(),a("div",null,p)}const A=s(o,[["render",t]]);export{d as __pageData,A as default};
