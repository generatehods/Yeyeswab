// ------------------------------
// YEYESWAB - web.js
// Auto Detect Token Mint + Swap
// Powered by Jupiter Aggregator
// ------------------------------

const RPC_URL = "https://api.mainnet-beta.solana.com";
const FEE_ADDRESS = "FSqRLFnykDnCZ6mQdnn4GPPwNz6NEFYU7sHKmrrw1X5b";

// --- Global states ---
let provider = null;
let walletPublicKey = null;

// ------------------------------
// Detect Phantom Provider
// ------------------------------
export function getProvider() {
    if ("phantom" in window) {
        const p = window.phantom?.solana;
        if (p?.isPhantom) return p;
    }
    alert("Phantom Wallet not detected!");
    return null;
}

// ------------------------------
// Connect Wallet
// ------------------------------
export async function connectWallet() {
    try {
        provider = getProvider();
        const resp = await provider.connect();
        walletPublicKey = resp.publicKey.toString();
        document.getElementById("walletAddress").innerText =
            walletPublicKey.substring(0, 6) + "..." + walletPublicKey.slice(-4);

        return walletPublicKey;
    } catch (err) {
        console.error("Wallet connection error:", err);
    }
}

// ------------------------------
// Auto Detect Token by MINT
// ------------------------------
export async function autoDetectToken(mintAddress) {
    try {
        const body = {
            jsonrpc: "2.0",
            id: 1,
            method: "getTokenSupply",
            params: [mintAddress]
        };

        const res = await fetch(RPC_URL, {
            method: "POST",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" }
        });

        const data = await res.json();

        if (!data.result) throw new Error("Invalid Token Mint");

        // Load metadata (symbol/name)
        const meta = await fetchTokenMeta(mintAddress);

        return {
            mint: mintAddress,
            symbol: meta?.symbol || "UNKNOWN",
            name: meta?.name || "Unknown Token",
            decimals: meta?.decimals || 9,
        };
    } catch (err) {
        console.error("Token detection failed:", err);
        return null;
    }
}

// ------------------------------
// Fetch Metadata via Jupiter Token API
// ------------------------------
export async function fetchTokenMeta(mint) {
    try {
        const res = await fetch("https://token.jup.ag/all");
        const list = await res.json();
        return list.find(t => t.address === mint);
    } catch {
        return null;
    }
}

// ------------------------------
// Load Token Balance
// ------------------------------
export async function loadBalance(mint) {
    if (!walletPublicKey) return "0";

    const body = {
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
            walletPublicKey,
            { mint: mint },
            { encoding: "jsonParsed" }
        ]
    };

    const res = await fetch(RPC_URL, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" }
    });

    const data = await res.json();

    const account = data.result?.value?.[0];
    if (!account) return "0";

    return account.account.data.parsed.info.tokenAmount.uiAmount;
}

// ------------------------------
// SWAP - Jupiter v6
// ------------------------------
export async function swapTokens(inputMint, outputMint, amount) {
    if (!walletPublicKey) {
        alert("Connect wallet first!");
        return;
    }

    const quoteURL =
        `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}` +
        `&outputMint=${outputMint}&amount=${amount}&slippageBps=100`;

    const quote = await fetch(quoteURL).then(r => r.json());

    const swapData = {
        quoteResponse: quote,
        userPublicKey: walletPublicKey,
        feeAccount: FEE_ADDRESS
    };

    const txRes = await fetch("https://quote-api.jup.ag/v6/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(swapData)
    }).then(r => r.json());

    const txBuf = Buffer.from(txRes.swapTransaction, "base64");
    const signed = await provider.signAndSendTransaction(
        await provider.signTransaction(
            solanaWeb3.Transaction.from(txBuf)
        )
    );

    return signed;
}
