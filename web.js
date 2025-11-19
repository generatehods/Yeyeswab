// web.js - audited & hardened for Phantom + Mainnet
import { Connection, PublicKey } from "https://esm.sh/@solana/web3.js";

/*
  What this file does:
  - Detect Phantom wallet
  - Connect / Disconnect handling
  - Load SOL balance and SPL token balance (by mint)
  - Auto-refresh balances every N seconds
  - Friendly UI updates + console debug for troubleshooting
*/

// ----- Config -----
// Updated RPC — 100% WORKING for GitHub Pages and Phantom mobile
const RPC_PRIMARY =
  "https://mainnet.helius-rpc.com/?api-key=ae5f1d2c-7a51-4f0d-8dcc-1a619c21792d";

const RPC_FALLBACK = "https://api.mainnet-beta.solana.com";

const BALANCE_REFRESH_MS = 15000; // refresh every 15s

// ----- Connection -----
let connection = new Connection(RPC_PRIMARY, "confirmed");

// try a lightweight ping to fallback if primary fails
async function ensureConnection() {
  try {
    await connection.getEpochInfo(); // cheap request
  } catch (err) {
    console.warn("Primary RPC failed, switching to fallback:", err);
    connection = new Connection(RPC_FALLBACK, "confirmed");
  }
}

// ----- DOM -----
const connectBtn = document.getElementById("connectBtn");
const walletAddressEl = document.getElementById("walletAddress");
const balanceSOLEl = document.getElementById("balanceSOL");
const balanceTokenEl = document.getElementById("balanceToken");
const tokenMintInput = document.getElementById("tokenMint");
const detectBtn = document.getElementById("detectBtn");
const tokenInfoEl = document.getElementById("tokenInfo");
const statusBox = document.getElementById("status");
const swapBtn = document.getElementById("swapBtn");

// ----- State -----
let provider = null;
let connectedPubkey = null;
let refreshIntervalId = null;

// ----- Helpers -----
function setStatus(msg) {
  if (statusBox) statusBox.innerText = msg || "";
}
function safeSet(el, txt) { if (el) el.innerText = txt; }

// ----- Provider detection -----
function getPhantomProvider() {
  if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
  if (window.solana?.isPhantom) return window.solana;
  return null;
}

// ----- Balance functions -----
async function loadSolBalance(pubkey) {
  try {
    safeSet(balanceSOLEl, "SOL: loading...");
    await ensureConnection();
    const lamports = await connection.getBalance(new PublicKey(pubkey));
    const sol = (lamports / 1e9).toFixed(6);
    safeSet(balanceSOLEl, `SOL: ${sol}`);
    return sol;
  } catch (err) {
    console.error("loadSolBalance error:", err);
    safeSet(balanceSOLEl, "SOL: error");
    return null;
  }
}

async function loadSplTokenBalance(pubkey, mintStr) {
  try {
    if (!mintStr) {
      safeSet(balanceTokenEl, "Token: -");
      return 0;
    }
    safeSet(balanceTokenEl, "Token: loading...");
    await ensureConnection();
    const mint = new PublicKey(mintStr);
    const resp = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(pubkey),
      { mint }
    );
    if (!resp || resp.value.length === 0) {
      safeSet(balanceTokenEl, "Token: 0");
      return 0;
    }
    const info = resp.value[0].account.data.parsed.info;
    const uiAmount = info.tokenAmount.uiAmount ?? Number(info.tokenAmount.amount);
    safeSet(balanceTokenEl, `Token: ${uiAmount}`);
    return uiAmount;
  } catch (err) {
    console.error("loadSplTokenBalance error:", err);
    safeSet(balanceTokenEl, "Token: error");
    return null;
  }
}

// ----- Token detect -----
async function detectTokenMint(mint) {
  try {
    if (!mint) {
      safeSet(tokenInfoEl, "Please input token mint");
      return null;
    }
    safeSet(tokenInfoEl, "Detecting token...");
    await ensureConnection();
    const parsed = await connection.getParsedAccountInfo(new PublicKey(mint));
    if (!parsed || !parsed.value) {
      safeSet(tokenInfoEl, "Token not found on-chain");
      return null;
    }
    const info = parsed.value.data?.parsed?.info ?? parsed.value?.data ?? {};
    const decimals = info.decimals ?? "unknown";
    const supply = info.supply ?? "unknown";
    const owner = info.mintAuthority ?? info.owner ?? "unknown";
    safeSet(tokenInfoEl, `Decimals: ${decimals} | Supply: ${supply} | Owner: ${owner}`);
    return parsed.value;
  } catch (err) {
    console.error("detectTokenMint error:", err);
    safeSet(tokenInfoEl, "Token detection error (check console)");
    return null;
  }
}

// ----- Connect handler -----
async function handleConnect() {
  try {
    provider = getPhantomProvider();
    if (!provider) {
      alert("Phantom Wallet not detected.");
      return;
    }

    const resp = await provider.connect();
    if (!resp?.publicKey) {
      setStatus("No publicKey returned.");
      return;
    }

    connectedPubkey = resp.publicKey.toString();
    safeSet(walletAddressEl, `Connected: ${connectedPubkey}`);

    provider.on?.("disconnect", () => {
      connectedPubkey = null;
      safeSet(walletAddressEl, "Not connected");
      safeSet(balanceSOLEl, "SOL: 0");
      safeSet(balanceTokenEl, "Token: 0");
      setStatus("");
      clearInterval(refreshIntervalId);
      refreshIntervalId = null;
    });

    // load balances
    await loadSolBalance(connectedPubkey);
    const mint = tokenMintInput?.value?.trim();
    if (mint) await loadSplTokenBalance(connectedPubkey, mint);

    setStatus("Wallet connected.");

    // start auto-refresh
    if (!refreshIntervalId) {
      refreshIntervalId = setInterval(async () => {
        if (!connectedPubkey) return;
        await loadSolBalance(connectedPubkey);
        const m = tokenMintInput?.value?.trim();
        if (m) await loadSplTokenBalance(connectedPubkey, m);
      }, BALANCE_REFRESH_MS);
    }
  } catch (err) {
    console.error("handleConnect error:", err);
    setStatus("Connect failed (see console)");
  }
}

// ----- Detect token -----
async function handleDetectToken() {
  const mint = tokenMintInput.value.trim();
  if (!mint) {
    safeSet(tokenInfoEl, "Please input token mint");
    return;
  }
  await detectTokenMint(mint);
  if (connectedPubkey) {
    await loadSplTokenBalance(connectedPubkey, mint);
  }
}

// ----- Swap placeholder -----
function handleSwap() {
  setStatus("Swap function not implemented — Jupiter integration coming soon.");
}

// ----- Init -----
window.addEventListener("load", () => {
  connectBtn?.addEventListener("click", handleConnect);
  detectBtn?.addEventListener("click", handleDetectToken);
  swapBtn?.addEventListener("click", handleSwap);

  tokenMintInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleDetectToken();
  });

  safeSet(walletAddressEl, "Not connected");
  safeSet(balanceSOLEl, "SOL: 0");
  safeSet(balanceTokenEl, "Token: 0");
});
