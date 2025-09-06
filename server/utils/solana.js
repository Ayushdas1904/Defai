import { Connection, Keypair } from '@solana/web3.js';

const secret = Uint8Array.from(JSON.parse(process.env.SOLANA_SECRET_KEY));
export const keypair = Keypair.fromSecretKey(secret);
const network = process.env.SOLANA_NETWORK;
export const connection = new Connection(clusterApiUrl(network), "confirmed");
