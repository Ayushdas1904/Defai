import { Connection, PublicKey } from '@solana/web3.js';

export async function getBalance({ walletPublicKey }) {
  const conn = new Connection('https://api.devnet.solana.com');
  const balance = await conn.getBalance(new PublicKey(walletPublicKey));
  return `${balance / 1e9} SOL`;
}
