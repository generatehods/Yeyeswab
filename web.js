import {
  Connection,
  PublicKey
} from "https://esm.sh/@solana/web3.js";

let walletPublicKey = null;
const connection = new Connection("https://api.mainnet-beta.solana.com");

// DOM
const connectBtn = document.getElementById("connectWalletBtn");
const balanceEl = document.querySelector(".balance");

// --- GET SOL BALANCE ---
async function getSolBalance(pubkey) {
  const lamports = await connection.getBalance(pubkey);
  return (lamports / 1e9).toFixed(4);
}

// --- CONNECT WALLET ---
// Desktop browser: window.solana
// Mobile app: deep link via solana-mobile-wallet-adapter
async function connectWallet() {
  try {
    if (window.solana && window.solana.isPhantom) {
      // Desktop / Mobile browser
      const resp = await window.solana.connect();
      walletPublicKey = resp.publicKey;
    } else {
      // Mobile deep link fallback
      // phantom://app/wallet-connect?uri=<WC_URI> 
      // (Phantom Mobile Wallet Adapter requires generating WalletConnect URI)
      alert("Open this page in a browser to connect wallet, or implement Solana Mobile Wallet Adapter in app.");
      return;
    }

    // Update button
    connectBtn.innerText = walletPublicKey.toString().slice(0, 4) + "..." + walletPublicKey.toString().slice(-4);

    // Show balance
    const solBal = await getSolBalance(walletPublicKey);
    balanceEl.innerText = `Balance: ${solBal} SOL`;

    // Auto-refresh every 10s
    setInterval(async () => {
      const solBal = await getSolBalance(walletPublicKey);
      balanceEl.innerText = `Balance: ${solBal} SOL`;
    }, 10000);

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
}

// --- BUTTON CLICK ---
connectBtn.addEventListener("click", async () => {
  if (!walletPublicKey) {
    await connectWallet();
  } else {
    await disconnectWallet();
  }
});
