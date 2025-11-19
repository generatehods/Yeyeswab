// web.js - Jupiter integrated swap logic for YEYESWAB

// CONSTANTS const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6/quote"; const JUPITER_SWAP_API = "https://quote-api.jup.ag/v6/swap"; const SOL_MINT = "So11111111111111111111111111111111111111112"; const FEE_WALLET = "FSqRLFnykDnCZ6mQdnn4GPPwNz6NEFYU7sHKmrrw1X5b";

let provider = null; let walletPublicKey = null;

// CONNECT WALLET window.connectWallet = async function () { return new Promise(async (resolve, reject) => { try { if (!window.phantom || !window.phantom.solana) return reject("Phantom not installed"); provider = window.phantom.solana; const resp = await provider.connect(); walletPublicKey = resp.publicKey.toString(); resolve(walletPublicKey); } catch (e) { reject(e); } }); };

// FETCH QUOTE window.getQuote = async function (fromMint, toMint, amount) { const inputAmount = Math.floor(amount * 1e6);

const url = ${JUPITER_QUOTE_API}?inputMint=${fromMint}&outputMint=${toMint}&amount=${inputAmount}&slippageBps=50; const res = await fetch(url); const json = await res.json();

if (!json.data || json.data.length === 0) throw new Error("No route found");

const route = json.data[0];

return { outAmount: (route.outAmount / 1e6).toFixed(6), priceImpact: route.priceImpactPct, route: route.swapMode, raw: route }; };

// EXECUTE SWAP window.executeSwap = async function (fromMint, toMint, amount) { if (!walletPublicKey) throw new Error("Wallet not connected");

const quote = await window.getQuote(fromMint, toMint, amount);

const swapRes = await fetch(JUPITER_SWAP_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quoteResponse: quote.raw, userPublicKey: walletPublicKey, wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: 5000, feeAccount: FEE_WALLET }) });

const swapData = await swapRes.json();

const txBuf = Buffer.from(swapData.swapTransaction, "base64");

const signedTx = await provider.signAndSendTransaction(txBuf);

return signedTx.signature; };
