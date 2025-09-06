import {
  clusterApiUrl,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

const network = process.env.SOLANA_NETWORK;
const connection = new Connection(clusterApiUrl(network), "confirmed");

export default async function send({ fromAddress, toAddress, amount, tokenSymbol }) {
  try {
    console.log("📦 send.js tool called with:", { fromAddress, toAddress, amount, tokenSymbol });

    if (!fromAddress || !toAddress || !amount || !tokenSymbol) {
      throw new Error("❌ Missing required fields");
    }

    // You can perform basic validation here.
    if (tokenSymbol.toLowerCase() !== 'sol') {
      throw new Error("This agent currently only supports sending SOL.");
    }

    console.log("✅ Arguments validated by backend.");

    // Return the raw arguments for the frontend to handle.
    return {
      toAddress,
      amount,
      tokenSymbol
    };
  } catch (error) {
    console.error("🔥 send.js tool failed:", error.message);
    throw error;
  }
}

