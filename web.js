import tokens from "./tokenlist.json" assert { type: "json" };

const FEE_ADDRESS = "FSqRLFnykDnCZ6mQdnn4GPPwNz6NEFYU7sHKmrrw1X5b";
let wallet = null;

// Detect Phantom
function getProvider() {
  if ("phantom" in window) {
    const provider = window.phantom?.solana;
    if (provider?.isPhantom) return provider;
  }
  return null;
}

// Connect Wallet
document.getElementById("connectButton").onclick = async () => {
  const provider = getProvider();
  if (!provider) return alert("Phantom not installed");

  try {
    const resp = await provider.connect();
    wallet = resp.publicKey.toString();

    document.getElementById("connectButton").innerText =
      wallet.slice(0, 4) + "..." + wallet.slice(-4);
  } catch (e) {
    console.log("Connection failed:", e);
  }
};

// Load token dropdowns
window.onload = () => {
  const from = document.getElementById("fromToken");
  const to = document.getElementById("toToken");

  tokens.forEach((t) => {
    from.innerHTML += `<option value="${t.mint}">${t.symbol}</option>`;
    to.innerHTML += `<option value="${t.mint}">${t.symbol}</option>`;
  });
};

// Fetch quote from Jupiter
async function getQuote(inputMint, outputMint, amount) {
  const url =
    `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`;

  return await fetch(url).then((r) => r.json());
}

// Swap button
document.getElementById("swapButton").onclick = async () => {
  if (!wallet) return alert("Connect wallet first");

  const inputMint = document.getElementById("fromToken").value;
  const outputMint = document.getElementById("toToken").value;
  const amount = Number(document.getElementById("fromAmount").value) * 1e9;

  const quote = await getQuote(inputMint, outputMint, amount);

  if (!quote.outAmount) {
    document.getElementById("status").innerText = "No liquidity.";
    return;
  }

  document.getElementById("toAmount").value =
    (quote.outAmount / 1e9).toFixed(6);

  document.getElementById("status").innerText =
    "Swap simulated (not executed). Real swap code can be added.";
};
