// ======================================================
// YEYESWAB DEX V2 (NO JUPITER SDK)
// Universal Swap (paste kontrak langsung bisa)
// Phantom Mobile Compatible (Nov 2025)
// ======================================================

const MY_WALLET = "FSqRLFnykDnCZ6mQdnn4GPPwNz6NEFYU7sHKmrrw1X5b";
const FEE_BPS = 85; // 0.85%
const RPC = "https://solana-rpc.tokodaring.com";

let wallet = null;
let pubkey = null;

let payMint = "So11111111111111111111111111111111111111112";     // default SOL
let receiveMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // default USDC

// ======================================================
// CONNECT WALLET
// ======================================================
async function connectWallet() {
  wallet = window.phantom?.solana || window.solana;

  if (!wallet || !wallet.isPhantom) {
    alert("Phantom tidak terdeteksi!");
    return;
  }

  try {
    const resp = await wallet.connect({ allowHighRiskActions: true });
    pubkey = resp.publicKey.toBase58();

    document.getElementById("connectWalletBtn").textContent =
      `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;

    updateBalance();
    alert("Connected!");
  } catch (err) {
    alert("Connect gagal: " + err.message);
  }
}

document.getElementById("connectWalletBtn")
  .addEventListener("click", connectWallet);


// ======================================================
// UPDATE BALANCE
// ======================================================
async function updateBalance() {
  try {
    const { Connection, PublicKey } = window.solanaWeb3;
    const c = new Connection(RPC);
    const b = await c.getBalance(new PublicKey(pubkey));

    document.querySelector(".balance").textContent =
      `Balance: ${(b / 1e9).toFixed(4)} SOL`;
  } catch (e) {
    document.querySelector(".balance").textContent = "Balance: --";
  }
}


// ======================================================
// UNIVERSAL TOKEN SELECTOR (paste kontrak langsung)
// ======================================================
document.getElementById("payToken").addEventListener("click", async () => {
  const mint = prompt("Input token mint address (PAY):");
  if (mint) {
    payMint = mint;
    document.getElementById("payToken").textContent = mint.slice(0, 4) + " ▼";
  }
});

document.getElementById("receiveToken").addEventListener("click", async () => {
  const mint = prompt("Input token mint address (RECEIVE):");
  if (mint) {
    receiveMint = mint;
    document.getElementById("receiveToken").textContent = mint.slice(0, 4) + " ▼";
  }
});


// ======================================================
// GET QUOTE (JUPITER API V6)
// ======================================================
async function getQuote(amount) {
  const url =
    `https://quote-api.jup.ag/v6/quote?` +
    `inputMint=${payMint}&outputMint=${receiveMint}` +
    `&amount=${amount}&slippageBps=100&feeBps=${FEE_BPS}`;

  const res = await fetch(url);
  return res.json();
}


// ======================================================
// BUILD TRANSACTION → USER SIGN → SEND
// ======================================================
async function executeSwap(amount) {
  const quote = await getQuote(amount);

  if (!quote.routePlan) {
    alert("Tidak ada route swap!");
    return;
  }

  const swapRes = await fetch("https://quote-api.jup.ag/v6/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: pubkey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      feeAccount: MY_WALLET
    })
  });

  const { swapTransaction } = await swapRes.json();

  const swapTx = swapTransaction;
  const txBytes = Uint8Array.from(atob(swapTx), c => c.charCodeAt(0));

  const signed = await wallet.signTransaction(
    window.solanaWeb3.Transaction.from(txBytes)
  );

  const { Connection } = window.solanaWeb3;
  const c = new Connection(RPC);

  const txid = await c.sendRawTransaction(signed.serialize(), {
    skipPreflight: true
  });

  alert("Swap sent!\nTX: " + txid);
}


// ======================================================
// SWAP BUTTON
// ======================================================
document.getElementById("swapBtn")
  .addEventListener("click", async () => {

    if (!pubkey) {
      alert("Connect wallet dulu!");
      return;
    }

    const amountInput = document.getElementById("payAmount").value;
    if (!amountInput || amountInput <= 0) {
      alert("Jumlah tidak valid!");
      return;
    }

    let amount = amountInput;

    // SOL pakai 1e9, SPL pakai 1eX → API Jupiter terima raw amount
    if (payMint === "So11111111111111111111111111111111111111112") {
      amount = Math.floor(amount * 1e9);
    }

    await executeSwap(amount);
  });


// ======================================================
// LOAD solanaWeb3
// ======================================================
(async () => {
  if (!window.solanaWeb3) {
    const s = document.createElement("script");
    s.src =
      "https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js";
    document.head.appendChild(s);
  }
})();
