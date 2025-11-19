import tokenList from "./tokenlist.json" assert { type: "json" };

let provider = null;
let publicKey = null;

provider = getProvider();

function getProvider() {
  if ("phantom" in window) {
    const prov = window.phantom?.solana;
    return prov?.isPhantom ? prov : null;
  }
  return null;
}

// Populate Token Dropdowns
const fromSel = document.getElementById("fromToken");
const toSel = document.getElementById("toToken");

tokenList.forEach(t => {
  const opt = `<option value="${t.address}" data-logo="${t.logo}" data-dec="${t.decimals}">${t.symbol}</option>`;
  fromSel.innerHTML += opt;
  toSel.innerHTML += opt;
});

// Update logos when token changes
fromSel.onchange = () => {
  document.getElementById("fromLogo").src = `assets/${fromSel.selectedOptions[0].dataset.logo}`;
  getBalance();
};
toSel.onchange = () => {
  document.getElementById("toLogo").src = `assets/${toSel.selectedOptions[0].dataset.logo}`;
};

// Connect Wallet
document.getElementById("connectBtn").onclick = async () => {
  if (!provider) return alert("Phantom not found!");

  const resp = await provider.connect();
  publicKey = resp.publicKey.toString();
  document.getElementById("walletAddress").innerText = publicKey;

  await getBalance();
};

// Get SOL or SPL balance
async function getBalance() {
  if (!publicKey) return;

  const connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com");

  const selected = fromSel.value;
  const decimals = Number(fromSel.selectedOptions[0].dataset.dec);

  if (selected === "So11111111111111111111111111111111111111112") {
    // SOL balance
    let lamports = await connection.getBalance(new solanaWeb3.PublicKey(publicKey));
    document.getElementById("balanceInfo").innerText = `Balance: ${(lamports / 1e9).toFixed(4)} SOL`;
    return;
  }

  // SPL Token balance
  const accounts = await connection.getParsedTokenAccountsByOwner(
    new solanaWeb3.PublicKey(publicKey),
    { mint: new solanaWeb3.PublicKey(selected) }
  );

  let balance = accounts.value.length
    ? accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount
    : 0;

  document.getElementById("balanceInfo").innerText =
    `Balance: ${balance.toFixed(4)} ${fromSel.selectedOptions[0].text}`;
}


// --- GET QUOTE ---
async function getQuote() {
  const amount = document.getElementById("fromAmount").value;
  if (!amount) return;

  const decimals = Number(fromSel.selectedOptions[0].dataset.dec);
  const inputAmount = amount * 10 ** decimals;

  const url =
    `https://quote-api.jup.ag/v6/quote?` +
    `inputMint=${fromSel.value}&` +
    `outputMint=${toSel.value}&` +
    `amount=${inputAmount}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.data || !data.data[0]) {
    document.getElementById("status").innerText = "No route found";
    return;
  }

  const out = data.data[0].outAmount / (10 ** Number(toSel.selectedOptions[0].dataset.dec));
  document.getElementById("toAmount").value = out.toFixed(6);

  window.bestRoute = data.data[0];
  document.getElementById("status").innerText = "Route found ✔";
}

// When user types → auto update quote
document.getElementById("fromAmount").oninput = () => {
  setTimeout(getQuote, 200);
};

// Manual quote button
document.getElementById("quoteBtn").onclick = getQuote;


// --- SWAP ---
document.getElementById("swapBtn").onclick = async () => {
  if (!publicKey) return alert("Connect wallet first!");
  if (!window.bestRoute) return alert("No route!");

  document.getElementById("status").innerText = "Preparing swap...";

  const swapRes = await fetch("https://quote-api.jup.ag/v6/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: window.bestRoute,
      userPublicKey: publicKey,
      wrapAndUnwrapSol: true
    })
  });

  const swapData = await swapRes.json();
  const txBuf = bs58.decode(swapData.swapTransaction);
  const tx = solanaWeb3.Transaction.from(txBuf);

  const signed = await provider.signTransaction(tx);

  const connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com");
  const txid = await connection.sendRawTransaction(signed.serialize());

  document.getElementById("status").innerText = `Swap Sent: ${txid}`;
};
