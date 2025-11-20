async function connectWallet() {
  const provider = window.phantom?.solana || window.solana;

  if (!provider || !provider.isPhantom) {
    alert("Phantom tidak terdeteksi! Gunakan Chrome/Phantom Browser.");
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

    // Load Jupiter
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
