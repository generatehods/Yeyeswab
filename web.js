// web.js (module)
const FEE_ADDRESS = "FSqRLFnykDnCZ6mQdnn4GPPwNz6NEFYU7sHKmrrw1X5b"; // saved from your memory
const CONNECTION_URL = "https://api.mainnet-beta.solana.com";
const JUPITER_QUOTE = "https://quote-api.jup.ag/v6/quote";
const JUPITER_SWAP = "https://quote-api.jup.ag/v6/swap";

let connection = new solanaWeb3.Connection(CONNECTION_URL);
let provider = null;
let walletPubkey = null;
let tokenList = [];
let bestRoute = null;
let busy = false;

// UI elements
const connectBtn = document.getElementById("connectBtn");
const balanceDisplay = document.getElementById("balanceDisplay");
const walletAddrEl = document.getElementById("walletAddr");
const fromTokenSel = document.getElementById("fromToken");
const toTokenSel = document.getElementById("toToken");
const fromAmountIn = document.getElementById("fromAmount");
const toAmountIn = document.getElementById("toAmount");
const quoteBtn = document.getElementById("quoteBtn");
const swapBtn = document.getElementById("swapBtn");
const statusEl = document.getElementById("status");
const routePreviewEl = document.getElementById("routePreview");
const tokenSearch = document.getElementById("tokenSearch");
const fromLogo = document.getElementById("fromLogo");
const toLogo = document.getElementById("toLogo");
const slippageIn = document.getElementById("slippage");
const chargeFeeChk = document.getElementById("chargeFee");
const flipBtn = document.getElementById("flipBtn");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistory");
const feeAddrEl = document.getElementById("feeAddr");
const dexFrame = document.getElementById("dexFrame");

// Show saved fee address
feeAddrEl.innerText = FEE_ADDRESS;

// Utility
function logStatus(text, isError=false){
  statusEl.innerText = text;
  statusEl.style.color = isError ? "#c02626" : "#0f1724";
}

// Load token list (fetch local json)
async function loadTokenList(){
  try {
    const res = await fetch("tokenlist.json");
    tokenList = await res.json();
    populateTokenDropdowns();
  } catch(e){
    console.error("Failed to load tokenlist", e);
    tokenList = [];
  }
}

function populateTokenDropdowns(){
  fromTokenSel.innerHTML = "";
  toTokenSel.innerHTML = "";
  tokenList.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.address;
    opt.dataset.dec = t.decimals;
    opt.dataset.logo = t.logo || "";
    opt.text = t.symbol;
    fromTokenSel.appendChild(opt);

    const opt2 = opt.cloneNode(true);
    toTokenSel.appendChild(opt2);
  });
  // default selection
  fromTokenSel.value = tokenList[0]?.address || "";
  toTokenSel.value = tokenList[1]?.address || tokenList[0]?.address || "";
  updateLogos();
  loadDexFrame();
}

function updateLogos(){
  const f = fromTokenSel.selectedOptions[0]?.dataset.logo || "sol.png";
  const t = toTokenSel.selectedOptions[0]?.dataset.logo || "usdc.png";
  fromLogo.src = `assets/${f}`;
  toLogo.src = `assets/${t}`;
}

// Connect Phantom
function getProvider(){
  if ("phantom" in window) {
    const prov = window.phantom?.solana;
    if (prov?.isPhantom) return prov;
  }
  return null;
}

connectBtn.onclick = async () => {
  try {
    provider = getProvider();
    if (!provider) return alert("Please install Phantom Wallet.");

    const resp = await provider.connect();
    walletPubkey = resp.publicKey.toString();
    walletAddrEl.innerText = walletPubkey;
    connectBtn.innerText = walletPubkey.slice(0,4)+"..."+walletPubkey.slice(-4);
    logStatus("Wallet connected ✔");
    await updateBalances();
  } catch (e) {
    console.error(e);
    logStatus("Connect failed", true);
  }
};

// Balance & token balance
async function updateBalances(){
  if (!walletPubkey) return;
  try {
    const pk = new solanaWeb3.PublicKey(walletPubkey);
    const lamports = await connection.getBalance(pk);
    const solBal = lamports / 1e9;
    balanceDisplay.innerText = `${solBal.toFixed(6)} SOL`;

    // Show selected token balance
    const selected = fromTokenSel.value;
    if (selected === "So11111111111111111111111111111111111111112"){
      // SOL already displayed
    } else {
      const parsed = await connection.getParsedTokenAccountsByOwner(pk, {mint: new solanaWeb3.PublicKey(selected)});
      const amt = parsed.value[0] ? parsed.value[0].account.data.parsed.info.tokenAmount.uiAmount : 0;
      balanceDisplay.innerText += ` • ${amt.toFixed(6)} ${fromTokenSel.selectedOptions[0].text}`;
    }
  } catch(e){
    console.error("Update balance error", e);
  }
}

// Search tokens
tokenSearch.oninput = () => {
  const q = tokenSearch.value.trim().toLowerCase();
  fromTokenSel.innerHTML = "";
  toTokenSel.innerHTML = "";
  const list = tokenList.filter(t => !q || t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
  list.forEach(t=>{
    const opt = document.createElement("option");
    opt.value = t.address; opt.dataset.dec = t.decimals; opt.dataset.logo = t.logo || "";
    opt.text = t.symbol;
    fromTokenSel.appendChild(opt);
    toTokenSel.appendChild(opt.cloneNode(true));
  });
  updateLogos();
};

// Auto quote on input (debounced)
let quoteTimer = null;
fromAmountIn.oninput = () => { clearTimeout(quoteTimer); quoteTimer = setTimeout(getQuote, 400); }

// Build quote request
async function getQuote(){
  const amount = Number(fromAmountIn.value);
  if (!amount || amount <= 0) {
    toAmountIn.value = "";
    routePreviewEl.innerText = "";
    return;
  }

  const inputMint = fromTokenSel.value;
  const outputMint = toTokenSel.value;
  const decimalsIn = Number(fromTokenSel.selectedOptions[0].dataset.dec || 9);
  const decimalsOut = Number(toTokenSel.selectedOptions[0].dataset.dec || 9);

  const amtInteger = Math.floor(amount * (10 ** decimalsIn));
  const slippagePct = Number(slippageIn.value) || 0.5;
  const slippageBps = Math.round(slippagePct * 100);

  logStatus("Fetching quote...");
  try {
    const url = `${JUPITER_QUOTE}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amtInteger}&slippageBps=${slippageBps}`;
    const r = await fetch(url);
    const j = await r.json();
    if (!j || !j.data || !j.data.length) {
      routePreviewEl.innerText = "No route found";
      toAmountIn.value = "";
      bestRoute = null;
      logStatus("No route", true);
      return;
    }
    bestRoute = j.data[0];
    const out = bestRoute.outAmount / (10 ** decimalsOut);
    toAmountIn.value = out.toFixed(6);

    // Show route preview
    const priceImpact = (bestRoute.priceImpactPct || 0) * 100;
    const estimatedFee = (bestRoute.estimatedAmount || 0) / (10 ** decimalsOut); // approximate
    routePreviewEl.innerHTML = `
      Route: ${bestRoute.marketInfos ? bestRoute.marketInfos.map(m=>m.label).join(" → ") : "Jupiter"}
      <br/>Price impact: ${priceImpact.toFixed(4)}% • Estimated out: ${out.toFixed(6)}
    `;
    logStatus("Route found ✔");
  } catch(e){
    console.error("Quote error", e);
    logStatus("Quote failed", true);
  }
}

// Swap execution (real)
quoteBtn.onclick = getQuote;

swapBtn.onclick = async () => {
  if (busy) return;
  if (!walletPubkey) return alert("Connect wallet first");
  if (!bestRoute) return alert("No route. Get a quote first.");

  busy = true;
  swapBtn.disabled = true;
  logStatus("Preparing swap...");

  try {
    // Optionally send small fee SOL first if checked
    if (chargeFeeChk.checked) {
      logStatus("Sending fee to receiver...");
      await sendFeeSol(0.001); // configurable small fee
      logStatus("Fee sent. Preparing swap...");
    }

    // Build swap request to Jupiter
    const swapBody = {
      quoteResponse: bestRoute,
      userPublicKey: walletPubkey,
      wrapUnwrapSOL: true,
      // slippage configured in quote already; extra guard:
      slippageBps: Math.round((Number(slippageIn.value)||0.5) * 100)
    };

    const swapRes = await fetch(JUPITER_SWAP, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(swapBody)
    });

    const swapJson = await swapRes.json();
    if (!swapJson || !swapJson.swapTransaction) {
      console.error("Swap response:", swapJson);
      throw new Error("Swap creation failed");
    }

    // decode, sign, send
    const txBytes = bs58.decode(swapJson.swapTransaction);
    const tx = solanaWeb3.Transaction.from(txBytes);

    // Phantom signs
    let signedTx;
    if (provider.signAndSendTransaction) {
      // Some wallets support direct sign & send
      const { signature } = await provider.signAndSendTransaction(tx);
      logStatus("Swap sent: " + signature);
      recordHistory({in: fromTokenSel.selectedOptions[0].text, out: toTokenSel.selectedOptions[0].text, id: signature});
      await updateBalances();
    } else {
      signedTx = await provider.signTransaction(tx);
      const raw = signedTx.serialize();
      const txid = await connection.sendRawTransaction(raw);
      await connection.confirmTransaction(txid);
      logStatus("Swap confirmed: " + txid);
      recordHistory({in: fromTokenSel.selectedOptions[0].text, out: toTokenSel.selectedOptions[0].text, id: txid});
      await updateBalances();
    }
  } catch(e){
    console.error("Swap error", e);
    logStatus("Swap failed: " + (e.message||e.toString()), true);
  } finally {
    busy = false;
    swapBtn.disabled = false;
  }
};

// Send small SOL fee to FEE_ADDRESS
async function sendFeeSol(amountSol=0.001){
  if (!walletPubkey) return;
  const fromPub = new solanaWeb3.PublicKey(walletPubkey);
  const toPub = new solanaWeb3.PublicKey(FEE_ADDRESS);
  const tx = new solanaWeb3.Transaction().add(
    solanaWeb3.SystemProgram.transfer({
      fromPubkey: fromPub,
      toPubkey: toPub,
      lamports: Math.round(amountSol * 1e9)
    })
  );

  // set recent blockhash
  tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
  tx.feePayer = fromPub;

  // sign & send via Phantom
  if (!provider) provider = getProvider();
  if (!provider) throw new Error("Wallet provider missing");

  const signed = await provider.signTransaction(tx);
  const raw = signed.serialize();
  const txid = await connection.sendRawTransaction(raw);
  await connection.confirmTransaction(txid, 'finalized');
  return txid;
}

// Flip tokens
flipBtn.onclick = () => {
  const a = fromTokenSel.value;
  const b = toTokenSel.value;
  fromTokenSel.value = b;
  toTokenSel.value = a;
  updateLogos();
  getQuote();
};

// Update logos and balances on selection change
fromTokenSel.onchange = () => { updateLogos(); updateBalances(); getQuote(); };
toTokenSel.onchange = () => { updateLogos(); getQuote(); };

// Dexscreener frame (basic: use symbol of selected pair if available)
function loadDexFrame(){
  try {
    const symbol = fromTokenSel.selectedOptions[0]?.text + "-" + toTokenSel.selectedOptions[0]?.text;
    // Dexscreener supports queries; using a simple generic frame
    dexFrame.src = `https://dexscreener.com/solana/${symbol}`;
  } catch(e){
    dexFrame.src = "";
  }
}

// History (localStorage)
function recordHistory(item){
  const hist = JSON.parse(localStorage.getItem("yeyes_history") || "[]");
  hist.unshift({time: Date.now(), ...item});
  localStorage.setItem("yeyes_history", JSON.stringify(hist.slice(0,50)));
  renderHistory();
}

function renderHistory(){
  const hist = JSON.parse(localStorage.getItem("yeyes_history") || "[]");
  historyList.innerHTML = hist.map(h=>`<li><div class="muted small">${new Date(h.time).toLocaleString()}</div>
    <div>${h.in} → ${h.out}<br/><a href="https://solscan.io/tx/${h.id}" target="_blank" rel="noopener">${h.id.slice(0,8)}...${h.id.slice(-8)}</a></div></li>`).join("");
}
clearHistoryBtn.onclick = () => { localStorage.removeItem("yeyes_history"); renderHistory(); };

// Init
(async function init(){
  await loadTokenList();
  renderHistory();
  loadDexFrame();
  logStatus("Ready");
})();
