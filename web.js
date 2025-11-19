import {
  Connection,
  PublicKey
} from "https://esm.sh/@solana/web3.js";

// ---- MAINNET CONNECTION ----
const connection = new Connection("https://api.mainnet-beta.solana.com");

// ---- DOM ELEMENTS ----
const connectBtn = document.getElementById("connectBtn");
const walletAddress = document.getElementById("walletAddress");
const balanceSOL = document.getElementById("balanceSOL");
const balanceToken = document.getElementById("balanceToken");
const tokenMintInput = document.getElementById("tokenMint");
const tokenInfo = document.getElementById("tokenInfo");
const detectBtn = document.getElementById("detectBtn");
const swapBtn = document.getElementById("swapBtn");
const statusBox = document.getElementById("status");

let connectedKey = null;

// ------------------------------------------------------
// CONNECT WALLET
// ------------------------------------------------------
connectBtn.onclick = async () => {
  try {
    const provider = window.phantom?.solana;
    if (!provider) return alert("Phantom not installed!");

    const resp = await provider.connect();
    connectedKey = new PublicKey(resp.publicKey.toString());

    walletAddress.innerHTML = connectedKey.toString();

    // Load SOL balance
    const solBal = await loadSolBalance(connectedKey);
    balanceSOL.innerHTML = `SOL: ${solBal}`;

    // If token mint filled, load token balance
    const mint = tokenMintInput.value.trim();
    if (mint.length > 0) {
      const tokenBal = await loadSplBalance(connectedKey, mint);
      balanceToken.innerHTML = `Token: ${tokenBal}`;
    }

  } catch (e) {
    alert("Wallet connection failed!");
  }
};

// ------------------------------------------------------
// LOAD SOL BALANCE
// ------------------------------------------------------
export async function loadSolBalance(pubkey) {
  try {
    const lamports = await connection.getBalance(pubkey);
    return (lamports / 1e9).toFixed(4);
  } catch (_) {
    return 0;
  }
}

// ------------------------------------------------------
// LOAD SPL TOKEN BALANCE
// ------------------------------------------------------
export async function loadSplBalance(pubkey, mintAddress) {
  try {
    const mint = new PublicKey(mintAddress);
    const ata = await connection.getParsedTokenAccountsByOwner(pubkey, { mint });

    if (ata.value.length === 0) return 0;

    return ata.value[0].account.data.parsed.info.tokenAmount.uiAmount;
  } catch (e) {
    return 0;
  }
}

// ------------------------------------------------------
// DETECT TOKEN INFO
// ------------------------------------------------------
detectBtn.onclick = async () => {
  const mint = tokenMintInput.value.trim();

  if (!mint) {
    tokenInfo.innerHTML = "Please input token mint";
    return;
  }

  try {
    const mintPk = new PublicKey(mint);
    const mintAcc = await connection.getParsedAccountInfo(mintPk);

    if (!mintAcc.value) {
      tokenInfo.innerHTML = "Invalid token mint!";
      return;
    }

    const data = mintAcc.value.data.parsed.info;
    tokenInfo.innerHTML = `
      <div>Name: ${data.name ?? "Unknown"}</div>
      <div>Decimals: ${data.decimals}</div>
      <div>Supply: ${data.supply}</div>
    `;

    // auto load balance
    if (connectedKey) {
      const bal = await loadSplBalance(connectedKey, mint);
      balanceToken.innerHTML = `Token: ${bal}`;
    }

  } catch {
    tokenInfo.innerHTML = "Token detection error!";
  }
};

// ------------------------------------------------------
// SWAP BUTTON (COMING SOON OR USING JUPITER API)
// ------------------------------------------------------
swapBtn.onclick = async () => {
  statusBox.innerHTML = "Swap function still in progress...";
};
