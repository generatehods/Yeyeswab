// ===========================
// YEYESWAB DEX – FINAL VERSION
// Phantom Android Fix (Nov 2025)
// ===========================

// Referral wallet & fee
const MY_WALLET = "FSqRLFnykDnCZ6mQdnn4GPPwNz6NEFYU7sHKmrrw1X5b";
const FEE_BPS = 85; // 0.85% referral fee
const FAST_RPC = "https://solana-rpc.tokodaring.com";

let jupiter;
let connected = false;


// =======================
// CONNECT WALLET (FIXED)
// =======================
async function connectWallet() {
  const provider = window.phantom?.solana || window.solana;

  if (!provider || !provider.isPhantom) {
    alert("Phantom tidak terdeteksi! Gunakan Chrome/Phantom Browser.");
    return;
  }

  try {
    // FIX Phantom Android
    const resp = await provider.connect({
      onlyIfTrusted: false,
      allowHighRiskActions: true,
      preferIframe: false
    });

    const pubkey = resp.publicKey.toBase58();

    document.getElementById("connectWalletBtn").textContent =
      `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;

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
    alert("Connected!");
  } catch (err) {
    console.error(err);
    alert("Connect gagal: " + err.message);
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
// BUTTON CONNECT
// =======================
document.getElementById("connectWalletBtn")
  .addEventListener("click", connectWallet);


// =======================
// BUTTON SWAP
// =======================
document.getElementById("swapBtn")
  .addEventListener("click", () => {

    if (!connected || !jupiter) {
      alert("Connect wallet dulu bro!");
      return;
    }

    const amount = document.getElementById("payAmount").value;

    if (!amount || amount <= 0) {
      alert("Masukkan jumlah swap!");
      return;
    }

    jupiter.open({
      inputMint: "So11111111111111111111111111111111111111112", // SOL
      outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
      amount: Math.floor(parseFloat(amount) * 1_000_000_000),
      slippageBps: 100
    });
  });


// =======================
// LOAD SOLANA WEB3 + JUPITER SDK
// =======================
(async () => {
  // Load solanaWeb3
  if (!window.solanaWeb3) {
    const s = document.createElement("script");
    s.src = "https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js";
    document.head.appendChild(s);
  }

  // Load Jupiter SDK (delay fix Android)
  setTimeout(() => {
    const j = document.createElement("script");
    j.src = "https://terminal.jup.ag/main/v1/sdk.js";
    j.onload = () => console.log("Jupiter SDK loaded");
    document.head.appendChild(j);
  }, 400);
})();
