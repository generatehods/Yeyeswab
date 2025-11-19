import {
  Connection,
  PublicKey
} from "https://esm.sh/@solana/web3.js";

const RPC = "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC);

// --- DOM ---
const connectBtn = document.getElementById("connectBtn");
const walletAddress = document.getElementById("walletAddress");

const balanceSOL = document.getElementById("balanceSOL");
const balanceToken = document.getElementById("balanceToken");

const tokenMintInput = document.getElementById("tokenMint");
const detectBtn = document.getElementById("detectBtn");
const tokenInfo = document.getElementById("tokenInfo");

const swapBtn = document.getElementById("swapBtn");
const statusBox = document.getElementById("status");

// --- STATE ---
let provider = null;
let connectedKey = null;

// ------------------------------------------------------------
// Detect Phantom provider
// ------------------------------------------------------------
function getProvider() {
  if ("phantom" in window) {
    const p = window.phantom?.solana;
    if (p?.isPhantom) return p;
  }
  alert("Phantom Wallet not found!");
  return null;
}

// ------------------------------------------------------------
// Load SOL Balance
// ------------------------------------------------------------
async function loadSolBalance(pubkey) {
  try {
    const lamports = await connection.getBalance(pubkey);
    const sol = (lamports / 1e9).toFixed(4);
    balanceSOL.innerHTML = `SOL: ${sol}`;
  } catch (err) {
    console.error("Failed to load SOL balance:", err);
    balanceSOL.innerHTML = "SOL: Error";
  }
}

// ------------------------------------------------------------
// Load token balance (SPL token)
// ------------------------------------------------------------
async function loadTokenBalance(pubkey, mintStr) {
  try {
    const mint = new PublicKey(mintStr);

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      pubkey,
      { mint }
    );

    if (tokenAccounts.value.length === 0) {
      balanceToken.innerHTML = "Token: 0";
      return;
    }

    const amount =
      tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;

    balanceToken.innerHTML = `Token: ${amount}`;
  } catch (err) {
    console.error(err);
    balanceToken.innerHTML = "Token: Error";
  }
}

// ------------------------------------------------------------
// Connect Wallet
// ------------------------------------------------------------
connectBtn.onclick = async () => {
  statusBox.innerHTML = "";
  provider = getProvider();

  if (!provider) return;

  try {
    const resp = await provider.connect();
    connectedKey = resp.publicKey;

    walletAddress.innerHTML =
      "Connected: " + connectedKey.toString().slice(0, 6) + "..." + connectedKey.toString().slice(-6);

    console.log("Connected wallet:", connectedKey.toString());

    // Load SOL Balance instantly
    await loadSolBalance(connectedKey);

    // Load token balance if mint is already filled
    if (tokenMintInput.value.trim() !== "") {
      await loadTokenBalance(connectedKey, tokenMintInput.value.trim());
    }
  } catch (err) {
    console.error("Connect error:", err);
    walletAddress.innerHTML = "Failed to connect";
  }
};

// ------------------------------------------------------------
// Detect Token Info
// ------------------------------------------------------------
detectBtn.onclick = async () => {
  const mint = tokenMintInput.value.trim();
  if (!mint || !connectedKey) {
    alert("Fill token mint and connect wallet first.");
    return;
  }

  tokenInfo.innerHTML = "Detecting...";

  await loadTokenBalance(connectedKey, mint);

  tokenInfo.innerHTML = "Token detected!";
};

// ------------------------------------------------------------
// Swap via Jupiter (simple mock placeholder)
// ------------------------------------------------------------
swapBtn.onclick = () => {
  statusBox.innerHTML =
    "Swap function not yet implemented in this demo.";
};
