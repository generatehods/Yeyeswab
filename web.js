// web.js - Jupiter integrated swap logic for YEYESWAB

// CONSTANTS const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6/quote"; const JUPITER_SWAP_API = "https://quote-api.jup.ag/v6/swap"; const SOL_MINT = "So11111111111111111111111111111111111111112"; const FEE_WALLET = "FSqRLFnykDnCZ6mQdnn4GPPwNz6NEFYU7sHKmrrw1X5b";

let provider = null; let walletPublicKey = null;

// CONNECT WALLET window.connectWallet = async function () { return new Promise(async (resolve, reject) => { try { if (!window.phantom || !window.phantom.solana) return reject("Phantom not installed"); provider = window.phantom.solana; const resp = await provider.connect(); walletPublicKey = resp.publicKey.toString(); resolve(walletPublicKey); } catch (e) { reject(e); } }); };

// FETCH QUOTE window.getQuote = async function (fromMint, toMint, amount) { const inputAmount = Math.floor(amount * 1e6);

const url = ${JUPITER_QUOTE_API}?inputMint=${fromMint}&outputMint=${toMint}&amount=${inputAmount}&slippageBps=50; const res = await fetch(url); const json = await res.json();

if (!json.data || json.data.length === 0) throw new Error("No route found");

const route = json.data[0];

return { outAmount: (route.outAmount / 1e6).toFixed(6), priceImpact: route.priceImpactPct, route: route.swapMode, raw: route }; };

// EXECUTE SWAP window.executeSwap = async function (fromMint, toMint, amount) { if (!walletPublicKey) throw new Error("Wallet not connected");

const quote = await window.getQuote(fromMint, toMint, amount);

const swapRes = await fetch(JUPITER_SWAP_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quoteResponse: quote.raw, userPublicKey: walletPublicKey, wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: 5000, feeAccount: FEE_WALLET }) });

const swapData = await swapRes.json();

const txBuf = Buffer.from(swapData.swapTransaction, "base64");

const signedTx = await provider.signAndSendTransaction(txBuf);

return signedTx.signature; };
import {
  Connection,
  PublicKey,
} from "https://esm.sh/@solana/web3.js@1.95.3";

const connection = new Connection("https://api.mainnet-beta.solana.com");

// ====== CONNECT WALLET ======
let provider = window.phantom?.solana;
let wallet = null;

document.getElementById("connectBtn").onclick = async () => {
  if (!provider) return alert("Phantom Not Installed");

  try {
    wallet = await provider.connect();
    document.getElementById("walletAddress").innerHTML =
      "Connected: " + wallet.publicKey.toString();
  } catch (e) {
    console.log(e);
  }
};

// ===== AUTO DETECT TOKEN =====
document.getElementById("detectBtn").onclick = async () => {
  const mint = document.getElementById("tokenMint").value.trim();
  if (!mint) return alert("Enter token mint");

  try {
    const info = await connection.getParsedAccountInfo(new PublicKey(mint));

    document.getElementById("tokenInfo").innerHTML =
      "<b>Token Detected</b><br>" +
      "Mint: " + mint + "<br>" +
      "Decimals: " + info.value.data.parsed.info.decimals;

  } catch (e) {
    alert("Invalid Mint");
  }
};

// ===== SWAP USING JUPITER =====
document.getElementById("swapBtn").onclick = async () => {
  const mint = document.getElementById("tokenMint").value.trim();
  const amount = document.getElementById("amount").value.trim();

  if (!wallet) return alert("Connect wallet first!");
  if (!mint || !amount) return alert("Fill all fields!");

  document.getElementById("status").innerHTML = "Fetching quote...";

  const quoteUrl =
    `https://quote-api.jup.ag/v6/quote?inputMint=${mint}&outputMint=So11111111111111111111111111111111111111112&amount=${amount * 10 ** 6}&slippageBps=50`;

  const quote = await fetch(quoteUrl).then((r) => r.json());

  if (!quote.data || quote.data.length === 0) {
    document.getElementById("status").innerHTML = "No route found!";
    return;
  }

  const swapUrl = "https://quote-api.jup.ag/v6/swap";
  const body = {
    quoteResponse: quote.data[0],
    userPublicKey: wallet.publicKey.toString(),
  };

  const swapData = await fetch(swapUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());

  let tx = swapData.swapTransaction;
  let recovered = await provider.signAndSendTransaction(
    Buffer.from(tx, "base64")
  );

  document.getElementById("status").innerHTML =
    "Swap sent! Tx: " + recovered.signature;
};
