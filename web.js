// ===========================
// YEYESWAB DEX – FINAL VERSION (ENGLISH)
// Phantom Android Fix + Custom Popup
// ===========================

// Referral wallet & fee
const MY_WALLET = "FSqRLFnykDnCZ6mQdnn4GPPwNz6NEFYU7sHKmrrw1X5b";
const FEE_BPS = 85; // 0.85% referral fee
const FAST_RPC = "https://solana-rpc.tokodaring.com";

let jupiter;
let connected = false;


// =======================
// CUSTOM POPUP (ENGLISH)
// =======================
function showPopup(msg) {
  const box = document.getElementById("popup");

  if (!box) {
    alert(msg);
    return;
  }

  box.textContent = msg;
  box.style.display = "block";

  setTimeout(() => {
    box.style.display = "none";
  }, 2000);
}


// =======================
// CONNECT WALLET
// =======================
async function connectWallet() {
  const provider = window.phantom?.solana || window.solana;

  if (!provider || !provider.isPhantom) {
    showPopup("Phantom not detected! Please use Chrome / Phantom Browser.");
    return;
  }

  try {
    const resp = await provider.connect({
      onlyIfTrusted: false,
      allowHighRiskActions: true,
      preferIframe: false
    });

    const pubkey = resp.publicKey.toBase58();

    document.getElementById("connectWalletBtn").textContent =
      `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;

    document.getElementById("logoutWalletBtn").style.display = "inline-block";

    updateBalance(pubkey);

    // Init Jupiter
    jupiter = await window.Jupiter.init({
      endpoint: FAST_RPC,
      formProps: { wallet: provider },
      feeBps: FEE_BPS,
      affiliateWallet: MY_WALLET,
      affiliateName: "yeyeswab"
    });

    connected = true;
    showPopup("Wallet Connected!");
  } catch (err) {
    console.error(err);
    showPopup("Connection failed: " + err.message);
  }
}


// =======================
// LOGOUT WALLET
// =======================
async function logoutWallet() {
  const provider = window.phantom?.solana || window.solana;

  if (!provider || !provider.isPhantom) {
    showPopup("Phantom not found.");
    return;
  }

  try {
    await provider.disconnect();
    connected = false;
    jupiter = null;

    document.getElementById("connectWalletBtn").textContent = "Connect Wallet";
    document.getElementById("logoutWalletBtn").style.display = "none";

    document.querySelector(".balance").textContent = "Balance: 0.00";

    showPopup("Wallet Disconnected!");
  } catch (err) {
    console.error(err);
    showPopup("Logout failed: " + err.message);
  }
}


// =======================
// UPDATE BALANCE
// =======================
async function updateBalance(pubkey) {
  try {
    const { Connection, PublicKey } = window.solanaWeb3;
    const connection = new Connection(FAST_RPC);
    const balance = await connection.getBalance(new PublicKey(pubkey));

    document.querySelector('.balance').textContent =
      `Balance: ${(balance / 1e9).toFixed(4)} SOL`;
  } catch (err) {
    console.error(err);
    document.querySelector('.balance').textContent = "Balance: --";
  }
}


// =======================
// CONNECT BUTTON
// =======================
document.getElementById("connectWalletBtn")
  .addEventListener("click", connectWallet);


// =======================
// LOGOUT BUTTON
// =======================
document.getElementById("logoutWalletBtn")
  .addEventListener("click", logoutWallet);


// =======================
// SWAP BUTTON
// =======================
document.getElementById("swapBtn")
  .addEventListener("click", () => {

    if (!connected || !jupiter) {
      showPopup("Please connect wallet first!");
      return;
    }

    const amount = document.getElementById("payAmount").value;

    if (!amount || amount <= 0) {
      showPopup("Enter swap amount!");
      return;
    }

    jupiter.open({
      inputMint: window.currentPayMint || "So11111111111111111111111111111111111111112", // Auto if detected
      outputMint: window.currentReceiveMint || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      amount: Math.floor(parseFloat(amount) * 1_000_000_000),
      slippageBps: 100
    });
  });



// ========================================================================
// 🔵 NEW FEATURE: AUTO-DETECT TOKEN FROM CONTRACT (JUPITER TOKEN METADATA)
// ========================================================================

const TOKEN_LIST_URL = "https://token.jup.ag/all";
let tokenMap = {};

// Load Token Metadata List
fetch(TOKEN_LIST_URL)
  .then(res => res.json())
  .then(tokens => {
    tokens.forEach(t => tokenMap[t.address] = t);
    console.log("Token Metadata Loaded:", tokens.length);
  });


// Listen for contract paste
document.getElementById("contractInput")?.addEventListener("input", () => {
  const mint = document.getElementById("contractInput").value.trim();

  if (!mint) return;

  if (!tokenMap[mint]) {
    showPopup("Token not found!");
    return;
  }

  const token = tokenMap[mint];

  // Update UI name
  document.getElementById("payToken").textContent = `${token.symbol} ▼`;

  // Update global mint
  window.currentPayMint = mint;

  // Update Logo
  if (token.logoURI) {
    document.querySelector(".logo-right").src = token.logoURI;
  }

  showPopup(`Detected: ${token.symbol}`);
});



// =======================
// LOAD SOLANA WEB3 + JUPITER SDK
// =======================
(async () => {
  if (!window.solanaWeb3) {
    const s = document.createElement("script");
    s.src = "https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js";
    document.head.appendChild(s);
  }

  setTimeout(() => {
    const j = document.createElement("script");
    j.src = "https://terminal.jup.ag/main/v1/sdk.js";
    j.onload = () => console.log("Jupiter SDK loaded");
    document.head.appendChild(j);
  }, 400);
})();
