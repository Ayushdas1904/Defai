declare global {
  interface Window {
    solana?: any;
  }
}

export const connectPhantom = async (): Promise<string | null> => {
  const provider = window.solana;

  if (!provider || !provider.isPhantom) {
    alert("Phantom wallet not installed");
    return null;
  }

  try {
    const resp = await provider.connect();
    return resp.publicKey.toString();
  } catch (err) {
    console.error("Phantom error:", err);
    return null;
  }
};
