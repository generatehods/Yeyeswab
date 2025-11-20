// ===========================
// YEYESWAB DEX – FINAL VERSION
// Phantom Android Fix + Custom Popup + SDK wait + LOGOUT
// ===========================

// Referral wallet & fee
const MY_WALLET = "FSqRLFnykDnCZ6mQdnn4GPPwNz6NEFYU7sHKmrrw1X5b";
const FEE_BPS = 85; // 0.85% referral fee
const FAST_RPC = "https://solana-rpc.tokodaring.com";

let jupiter;
let connected = false;
let provider;


// =======================
// POPUP CUSTOM
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
// UTILS: waitFor
// =======================
async function waitFor(conditionFn, timeoutMs = 10000, intervalMs = 200) {
  const start = Date.now();
  while (!conditionFn()) {
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return true;
}


// =======================
// CONNECT WALLET (MOBILE FIX)
// =======================
async function connectWallet() {
  provider = window.phantom?.solana || window.solana;

  if (!provider || !provider.isPhantom) {
    showPopup("Phantom tidak terdeteksi! Gunakan Chrome / Phantom Browser.");
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

    updateBalance(pubkey);

    // TUNGGU Jupiter SDK siap
    const ok = await waitFor(() => !!window.Jupiter, 10000, 200);

    if (!ok) {
      showPopup("Jupiter SDK belum siap. Refresh halaman atau buka di Chrome.");
      return;
    }

    // Init Jupiter
    jupiter = await window.Jupiter.init({
      endpoint: FAST_RPC,
      formProps: { wallet: provider },
      feeBps: FEE_BPS,
      affiliateWallet: MY_WALLET,
      affiliateName: "yeyeswab"
    });

    connected = true;
    showPopup("Connected!");

    document.getElementById("logoutWalletBtn").style.display = "inline-block";

  } catch (err) {
    console.error(err);
    showPopup("Connect gagal: " + (err?.message || err));
  }
}



// =======================
// LOGOUT WALLET
// =======================
async function logoutWallet() {
  if (!provider) {
    showPopup("Wallet belum terkoneksi.");
    return;
  }

  try {
    await provider.disconnect();

    connected = false;
    jupiter = null;

    // Reset UI
    document.getElementById("connectWalletBtn").textContent = "Connect Wallet";
    document.querySelector('.balance').textContent = "Balance: --";
    document.getElementById("logoutWalletBtn").style.display = "none";

    showPopup("Wallet berhasil logout!");
  } catch (err) {
    console.error(err);
    showPopup("Gagal logout: " + (err?.message || err));
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
// BUTTON LOGOUT
// =======================
document.getElementById("logoutWalletBtn")
  .addEventListener("click", logoutWallet);



// =======================
// BUTTON SWAP
// =======================
document.getElementById("swapBtn")
  .addEventListener("click", () => {

    if (!connected || !jupiter) {
      showPopup("Connect wallet dulu bro!");
      return;
    }

    const amount = document.getElementById("payAmount").value;

    if (!amount || amount <= 0) {
      showPopup("Masukkan jumlah swap!");
      return;
    }

    if (!window.Jupiter) {
      showPopup("Jupiter SDK belum siap.");
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
(function loadLibs() {
  if (!window.solanaWeb3) {
    const s = document.createElement("script");
    s.src = "https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js";
    s.async = true;
    document.head.appendChild(s);
  }

  setTimeout(() => {
    if (!window.Jupiter) {
      const j = document.createElement("script");
      j.src = "https://terminal.jup.ag/main/v1/sdk.js";
      j.async = true;
      j.onload = () => console.log("Jupiter SDK loaded");
      document.head.appendChild(j);
    }
  }, 400);
})();
