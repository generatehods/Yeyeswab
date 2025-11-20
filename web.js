// web.js – YEYESWAB DEX (Fix 100% kerja di Phantom Android & Desktop – Nov 2025)

let jupiter;
let connected = false;

// GANTI DENGAN WALLET KAMU (untuk terima fee otomatis)
const MY_WALLET = "GANTI_DENGAN_WALLET_MU_DISINI"; // ← WAJIB DIGANTI!!!
const FEE_BPS = 85; // 0.85% fee per swap masuk ke kamu

// RPC SUPER CEPAT & STABIL (khusus Indonesia/Asia 2025)
const FAST_RPC = "https://solana-rpc.tokodaring.com";  // ← Ganti semua RPC jadi ini

// Connect Wallet (Phantom / Solflare / dll)
async function connectWallet() {
  if (!window.solana) {
    alert("Phantom atau wallet Solana belum terdeteksi!\nInstall dulu: phantom.app");
    window.open("https://phantom.app", "_blank");
    return;
  }

  try {
    await window.solana.connect();
    const pubkey = window.solana.publicKey.toBase58();
    document.getElementById("connectWalletBtn").textContent = 
      `\( {pubkey.slice(0,4)}... \){pubkey.slice(-4)}`;

    // Update balance SOL
    updateBalance(pubkey);

    // Init Jupiter dengan RPC cepat + fee referral
    jupiter = await window.Jupiter.init({
      endpoint: FAST_RPC,
      formProps: { wallet: window.solana },
      feeBps: FEE_BPS,
      affiliateWallet: MY_WALLET,
      affiliateName: "yeyeswab"
    });

    connected = true;
    alert("YEYESWAB Connected! Sekarang bisa Swap 🔥");
  } catch (err) {
    console.error(err);
    alert("Connect gagal: " + err.message + "\nCoba refresh halaman atau buka di Chrome");
  }
}

// Update balance SOL
async function updateBalance(pubkey) {
  try {
    const { Connection, PublicKey } = window.solanaWeb3;
    const connection = new Connection(FAST_RPC);
    const balance = await connection.getBalance(new PublicKey(pubkey));
    document.querySelector('.balance').textContent = 
      `Balance: ${(balance / 1e9).toFixed(4)} SOL`;
  } catch {
    document.querySelector('.balance').textContent = "Balance: --";
  }
}

// Tombol Connect
document.getElementById("connectWalletBtn").addEventListener("click", connectWallet);

// Tombol Swap → buka Jupiter Terminal (paling gampang & terbaik)
document.getElementById("swapBtn").addEventListener("click", () => {
  if (!connected || !jupiter) {
    alert("Connect wallet dulu bro!");
    return;
  }

  const amount = document.getElementById("payAmount").value;
  if (!amount || amount <= 0) {
    alert("Masukin jumlah dulu!");
    return;
  }

  jupiter.open({
    inputMint: "So11111111111111111111111111111111111111112", // SOL
    outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    amount: Math.floor(parseFloat(amount) * 1_000_000_000),     // lamports
    slippageBps: 100 // 1% slippage (bisa diatur)
  });
});

// Load web3.js & Jupiter SDK otomatis
(async () => {
  if (!window.solanaWeb3) {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js";
    document.head.appendChild(script);
  }
  if (!window.Jupiter) {
    const script = document.createElement("script");
    script.src = "https://terminal.jup.ag/main/v1/sdk.js";
    script.onload = () => console.log("Jupiter SDK loaded");
    document.head.appendChild(script);
  }
})();
