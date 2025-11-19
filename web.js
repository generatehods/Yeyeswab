import {
    Connection,
    PublicKey,
    LAMPORTS_PER_SOL,
    Transaction,
    clusterApiUrl
} from "https://esm.sh/@solana/web3.js";

// --- TOKEN LIST (+ LOGO) ---
export const ALL_TOKENS = [
    { name: "SOL", mint: "So11111111111111111111111111111111111111112", decimals: 9, logo: "https://logos.decentralized.site/SOL.png" },
    { name: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGHZad949EoE", decimals: 6, logo: "https://logos.decentralized.site/USDC.png" },
    { name: "USDT", mint: "Es9vMFrzaCERzYLztsF6D2PfYZ7R6puj949iEzb7gA3y", decimals: 6, logo: "https://logos.decentralized.site/USDT.png" },
    { name: "JUP", mint: "JUPyiwrYJFskUPiHa7hkeR8bocQokkBZexzL8CyhrUD", decimals: 6, logo: "https://logos.decentralized.site/JUP.png" },
    { name: "BONK", mint: "DezX8Bn7kgTXdseztF22G6Kje9F3HUMisAJKEMGfS1PT", decimals: 5, logo: "https://logos.decentralized.site/BONK.png" },
    { name: "WEN", mint: "5h7E2B5eB5tT4q1M12zS8f4fK6M22P7T4v8G4g6X6Q2", decimals: 5, logo: "https://logos.decentralized.site/WEN.png" }
];

// YOUR REFERRAL WALLET
const REFERRAL_FEE_ACCOUNT = "FSqRLFnykDnCZ6mQdnn4GPPwNz6NEFYU7sHKmrrw1X5b";
const REFERRAL_FEE_BPS = 30;

const JUP_API = "https://quote-api.jup.ag/v6/quote";
const connection = new Connection(clusterApiUrl('mainnet-beta'), "confirmed");

let wallet = null;

// UI references
const connectBtn = document.getElementById("connectBtn");
const tokenIn = document.getElementById("tokenIn");
const tokenOut = document.getElementById("tokenOut");
const amountIn = document.getElementById("amountIn");
const balanceLabel = document.getElementById("balance");
const errorMsg = document.getElementById("errorMsg");
const loader = document.getElementById("loader");
const priceBox = document.getElementById("priceInfo");

// loader on/off
function showLoader(show) {
    loader.style.display = show ? "block" : "none";
}

function showError(msg) {
    errorMsg.innerText = msg;
    setTimeout(() => errorMsg.innerText = "", 4000);
}

// BALANCE
async function getWalletBalances(publicKey) {
    const pk = new PublicKey(publicKey);
    const balances = {};

    // SOL
    const sol = await connection.getBalance(pk);
    balances["So11111111111111111111111111111111111111112"] = sol / LAMPORTS_PER_SOL;

    // SPL
    for (const t of ALL_TOKENS.filter(x => x.name !== "SOL")) {
        try {
            const accs = await connection.getTokenAccountsByOwner(pk, { mint: new PublicKey(t.mint) });
            if (accs.value.length === 0) {
                balances[t.mint] = 0;
            } else {
                const info = await connection.getTokenAccountBalance(accs.value[0].pubkey);
                balances[t.mint] = info.value.uiAmount;
            }
        } catch {
            balances[t.mint] = 0;
        }
    }
    return balances;
}

// UPDATE UI token list
async function updateTokenList(balances) {
    tokenIn.innerHTML = '<option disabled selected>Select Token In</option>';
    tokenOut.innerHTML = '<option disabled selected>Select Token Out</option>';

    ALL_TOKENS.forEach(t => {
        let bal = balances[t.mint] || 0;

        let optIn = document.createElement("option");
        optIn.value = t.mint;
        optIn.innerHTML = `🟣 ${t.name} (${bal})`;
        tokenIn.appendChild(optIn);

        let optOut = document.createElement("option");
        optOut.value = t.mint;
        optOut.innerHTML = `🟦 ${t.name}`;
        tokenOut.appendChild(optOut);
    });

    // Update SOL balance
    balanceLabel.innerText = balances["So11111111111111111111111111111111111111112"] + " SOL";
}

// CONNECT WALLET
connectBtn.onclick = async () => {
    if (!window.phantom?.solana) return showError("Install Phantom Wallet.");

    try {
        const resp = await window.phantom.solana.connect();
        wallet = resp.publicKey.toString();
        connectBtn.innerText = "Connected: " + wallet.substring(0, 6) + "...";

        showLoader(true);
        const balances = await getWalletBalances(wallet);
        await updateTokenList(balances);
        showLoader(false);

    } catch (e) {
        showError("Connection failed.");
    }
};

// REALTIME PRICE
async function updatePrice() {
    const mintIn = tokenIn.value;
    const mintOut = tokenOut.value;
    const amount = amountIn.value;

    if (!amount || !mintIn || !mintOut) {
        priceBox.innerText = "";
        return;
    }

    const info = ALL_TOKENS.find(t => t.mint === mintIn);
    const lamports = Math.floor(amount * 10 ** info.decimals);

    const res = await fetch(`${JUP_API}?inputMint=${mintIn}&outputMint=${mintOut}&amount=${lamports}`);
    const q = await res.json();

    if (q.error) {
        priceBox.innerText = "⚠ Minimum amount too small.";
        return;
    }

    priceBox.innerText = `≈ ${q.outAmount / (10 ** q.outputDecimals)} ${q.outputMint}`;
}

// UPDATE PRICE WHEN USER TYPES
amountIn.oninput = updatePrice;
tokenIn.onchange = updatePrice;
tokenOut.onchange = updatePrice;

// SWAP
document.getElementById("swapBtn").onclick = async () => {
    if (!wallet) return showError("Connect wallet first.");

    const mintIn = tokenIn.value;
    const mintOut = tokenOut.value;
    const amount = amountIn.value;

    if (!amount) return showError("Enter amount.");
    if (!mintIn || !mintOut) return showError("Select tokens.");
    if (mintIn === mintOut) return showError("Cannot swap same token.");

    const info = ALL_TOKENS.find(t => t.mint === mintIn);
    const lamports = Math.floor(amount * 10 ** info.decimals);

    try {
        showLoader(true);
        showError("Getting quote...");

        const quoteRes = await fetch(`${JUP_API}?inputMint=${mintIn}&outputMint=${mintOut}&amount=${lamports}`);
        const quote = await quoteRes.json();

        if (quote.error) {
            showLoader(false);
            return showError("Minimum swap too small.");
        }

        quote.feeAccount = REFERRAL_FEE_ACCOUNT;
        quote.feeBps = REFERRAL_FEE_BPS;

        // build transaction
        const txRes = await fetch("https://quote-api.jup.ag/v6/swap-instructions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quoteResponse: quote, userPublicKey: wallet })
        });

        const txInfo = await txRes.json();
        const tx = Transaction.from(Buffer.from(txInfo.swapTransaction, "base64"));
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        const signed = await window.phantom.solana.signTransaction(tx);
        const txid = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(txid);

        alert("Swap Success!\nTx: " + txid);

        // refresh balance
        const balances = await getWalletBalances(wallet);
        updateTokenList(balances);

    } catch (e) {
        showError("Swap failed.");
    }

    showLoader(false);
};
