import { Connection, PublicKey, Transaction, SystemProgram } from "https://esm.sh/@solana/web3.js";

// --- CONFIG MAINNET ---
const connection = new Connection("https://api.mainnet-beta.solana.com");

// DOM
const connectBtn = document.getElementById("connectWalletBtn");
const balanceEl = document.querySelector(".balance");
const payAmountEl = document.getElementById("payAmount");
const receiveAmountEl = document.getElementById("receiveAmount");
const payTokenEl = document.getElementById("payToken");
const receiveTokenEl = document.getElementById("receiveToken");
const swapBtn = document.getElementById("swapBtn");

// SPL Token Example: USDC Mainnet
const USDC_MINT = new PublicKey("EPjFWdd5AuHj4cA4C1QJDZ2sRfjMTFqonF9xS1k2s4");

let walletPublicKey = null;

// --- GET SOL BALANCE ---
async function getSolBalance(pubkey) {
  const lamports = await connection.getBalance(pubkey);
  return (lamports / 1e9).toFixed(4);
}

// --- GET SPL TOKEN BALANCE ---
async function getSplTokenBalance(pubkey, mint) {
  const accounts = await connection.getTokenAccountsByOwner(pubkey, { mint });
  if (accounts.value.length === 0) return 0.0;
  const amount = accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
  return amount;
}

// --- LOAD BALANCES ---
async function loadBalances() {
  if (!walletPublicKey) return;

  const solBal = await getSolBalance(walletPublicKey);
  balanceEl.innerText = `Balance: ${solBal} SOL`;

  const usdcBal = await getSplTokenBalance(walletPublicKey, USDC_MINT);
  if (payTokenEl.innerText.startsWith("USDC")) {
    payAmountEl.value = usdcBal;
  } else {
    receiveAmountEl.value = usdcBal;
  }
}

// --- CONNECT WALLET ---
async function connectWallet() {
  try {
    if (window.solana && window.solana.isPhantom) {
      const resp = await window.solana.connect();
      walletPublicKey = resp.publicKey;
    } else {
      alert("Open in a browser or implement Solana Mobile Wallet Adapter for Phantom App Android.");
      return;
    }

    connectBtn.innerText = walletPublicKey.toString().slice(0,4) + "..." + walletPublicKey.toString().slice(-4);

    await loadBalances();
    setInterval(loadBalances, 10000); // auto refresh

  } catch (err) {
    console.error("Connect wallet failed:", err);
  }
}

// --- DISCONNECT ---
async function disconnectWallet() {
  if (window.solana && window.solana.isConnected) {
    await window.solana.disconnect();
  }
  walletPublicKey = null;
  connectBtn.innerText = "Connect Wallet";
  balanceEl.innerText = "Balance: 0.00";
  payAmountEl.value = "0.0";
  receiveAmountEl.value = "0.0";
}

// --- SWAP LOGIC (Simplified, Mainnet SOL ↔ USDC) ---
// NOTE: For production, integrate Jupiter/Raydium API for real swap
async function swap() {
  if (!walletPublicKey) {
    alert("Connect your wallet first!");
    return;
  }

  let payToken = payTokenEl.innerText;
  let receiveToken = receiveTokenEl.innerText;
  let payAmount = parseFloat(payAmountEl.value);

  if (payAmount <= 0) {
    alert("Enter amount to swap");
    return;
  }

  // Dummy logic: just toggle balances
  if (payToken.startsWith("SOL") && receiveToken.startsWith("USDC")) {
    // Swap SOL → USDC (example rate 1 SOL = 20 USDC)
    const usdcReceived = payAmount * 20;
    payAmountEl.value = 0;
    receiveAmountEl.value = usdcReceived.toFixed(4);
  } else if (payToken.startsWith("USDC") && receiveToken.startsWith("SOL")) {
    // Swap USDC → SOL (1 SOL = 20 USDC)
    const solReceived = payAmount / 20;
    payAmountEl.value = 0;
    receiveAmountEl.value = solReceived.toFixed(4);
  } else {
    alert("Unsupported token swap");
  }

  // Reload balances after swap
  await loadBalances();
}

// --- EVENT LISTENERS ---
connectBtn.addEventListener("click", async () => {
  if (!walletPublicKey) {
    await connectWallet();
  } else {
    await disconnectWallet();
  }
});

swapBtn.addEventListener("click", swap);

// Optional: Switch button (⇅)
document.querySelector(".switch-btn").addEventListener("click", () => {
  // Swap tokens in UI
  let temp = payTokenEl.innerText;
  payTokenEl.innerText = receiveTokenEl.innerText;
  receiveTokenEl.innerText = temp;

  // Swap values
  let tempVal = payAmountEl.value;
  payAmountEl.value = receiveAmountEl.value;
  receiveAmountEl.value = tempVal;
});
