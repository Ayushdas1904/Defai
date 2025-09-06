import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';

export default async function getBalance({ tokenSymbol, publicKey }) {
  if (!publicKey) throw new Error("Missing public key");
  if (tokenSymbol !== 'SOL') throw new Error("Only SOL is supported currently");

  const network = process.env.SOLANA_NETWORK;
  const connection = new Connection(clusterApiUrl(network)) || new Connection(clusterApiUrl("devnet"));
  const pubKey = new PublicKey(publicKey);
  const balance = await connection.getBalance(pubKey);
  
  return {
    balance: (balance / LAMPORTS_PER_SOL).toFixed(9) + " SOL"
  };
};
