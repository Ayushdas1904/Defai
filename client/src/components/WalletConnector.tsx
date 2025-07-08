import { useState, useEffect } from "react";
import { connectMetaMask } from "../wallets/evm";
import { connectPhantom } from "../wallets/solana";

export default function WalletConnector() {
  const [evmAddress, setEvmAddress] = useState<string | null>(null);
  const [solAddress, setSolAddress] = useState<string | null>(null);

  useEffect(() => {
    // Auto-reconnect MetaMask
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts.length > 0) setEvmAddress(accounts[0]);
      });
    }

    // Auto-reconnect Phantom
    if (window.solana?.isPhantom) {
      window.solana.connect({ onlyIfTrusted: true }).then((res: { publicKey: { toString(): string } }) => {
        setSolAddress(res.publicKey.toString());
      });
    }
  }, []);

  const handleMetaMaskConnect = async () => {
    const addr = await connectMetaMask();
    if (addr) {
      setEvmAddress(addr);
      setSolAddress(null); // Disconnect Phantom session logically
    }
  };

  const handlePhantomConnect = async () => {
    const addr = await connectPhantom();
    if (addr) {
      setSolAddress(addr);
      setEvmAddress(null); // Disconnect MetaMask session logically
    }
  };

  return (
    <div className="space-y-4 text-center">
      <button
        onClick={handleMetaMaskConnect}
        className="px-4 py-2 bg-orange-600 text-white rounded"
        disabled={!!solAddress}
      >
        Connect MetaMask
      </button>
      {evmAddress && <p className="text-sm text-gray-500">MetaMask: {evmAddress}</p>}

      <button
        onClick={handlePhantomConnect}
        className="px-4 py-2 bg-purple-600 text-white rounded"
        disabled={!!evmAddress}
      >
        Connect Phantom
      </button>
      {solAddress && <p className="text-sm text-gray-500">Phantom: {solAddress}</p>}
    </div>
  );
}
