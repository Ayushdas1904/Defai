declare global {
  interface Window {
    ethereum?: any;
  }
}

export const connectMetaMask = async (): Promise<string | null> => {
  if (!window.ethereum) {
    alert("MetaMask not installed");
    return null;
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    return accounts[0];
  } catch (err) {
    console.error("MetaMask error:", err);
    return null;
  }
};
