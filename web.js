import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "https://esm.sh/@solana/web3.js";

const RPC = "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC, "confirmed");

let provider = null;
let wallet = null;

// ================================
// 1. CONNECT WALLET
// ================================
document.getElementById("connectBtn").onclick = async () => {
  try {
    if (!window.phantom?.solana) {
      alert("Phantom Wallet not found");
      return;
    }

    provider = window.phantom.solana;
    const res = await provider.connect();
    wallet = res.publicKey.toString();

    document.getElementById("walletAddress").innerText =
      "Connected: " + wallet;
  } catch (e) {
    console.error(e);
  }
};

// ================================
// 2. AUTO DETECT TOKEN MINT
// ================================
document.getElementById("detectBtn").onclick = async () => {
  let mint = document.getElementById("tokenMint").value.trim();
  if (!mint) return;

  try {
    const pk = new PublicKey(mint);
    const info = await connection.getParsedAccountInfo(pk);

    if (!info || !info.value) {
      document.getElementById("tokenInfo").innerText =
        "Invalid mint address!";
      return;
    }

    const data = info.value.data.parsed.info;

    const decimals = data.decimals;
    const supply = data.supply;

    document.getElementById("tokenInfo").innerHTML = `
      <b>Detected Token:</b><br>
      Decimals: ${decimals}<br>
      Supply: ${supply}<br>
    `;
  } catch (e) {
    document.getElementById("tokenInfo").innerHTML = "Error reading token";
    console.error(e);
  }
};

// ================================
// 3. SWAP via Jupiter API
// ================================
async function getQuote(inputMint, outputMint, amount) {
  const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=100`;

  const res = await fetch(url);
  return res.json();
}

async function executeSwap(quote) {
  const url = `https://quote-api.jup.ag/v6/swap`;
  const body = {
    quoteResponse: quote,
    userPublicKey: wallet,
    wrapAndUnwrapSol: true,
    feeAccount: "FSqRLFnykDnCZ6mQdnn4GPPwNz6NEFYU7sHKmrrw1X5b",
  };

  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
  });

  return await response.json();
}

// ================================
// 4. BUTTON SWAP
// ================================
document.getElementById("swapBtn").onclick = async () => {
  try {
    let mint = document.getElementById("tokenMint").value.trim();
    let amount = document.getElementById("amount").value.trim();
    if (!mint || !amount) return;

    document.getElementById("status").innerHTML = "Fetching quote…";

    // Fetch decimals to adjust amount
    const mintInfo = await connection.getParsedAccountInfo(new PublicKey(mint));
    const decimals = mintInfo.value.data.parsed.info.decimals;

    const rawAmount = Math.floor(Number(amount) * 10 ** decimals);

    // Quote inputMint → SOL
    const quote = await getQuote(mint, "So11111111111111111111111111111111111111112", rawAmount);

    document.getElementById("status").innerHTML = "Quote received. Building TX…";

    // Request Jupiter Swap transaction
    const swap = await executeSwap(quote);

    const txBuf = Buffer.from(swap.swapTransaction, "base64");
    const transaction = Transaction.from(txBuf);

    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    document.getElementById("status").innerHTML = "Signing…";

    const signed = await provider.signTransaction(transaction);

    const txid = await connection.sendRawTransaction(signed.serialize());

    document.getElementById("status").innerHTML =
      "Swap Sent! TX: " + txid;
  } catch (e) {
    console.error(e);
    document.getElementById("status").innerHTML = "Swap failed.";
  }
};
