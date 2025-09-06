// tools/getTransactionHistory.js
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

// Connect to the same network your app is using from environment variable.
const network = process.env.SOLANA_NETWORK || "mainnet-beta";
const connection = new Connection(clusterApiUrl(network), "confirmed");

export default async function getTransactionHistory({ walletAddress, limit = 5 }) {
  console.log("📜 getTransactionHistory.js called with:", { walletAddress, limit });
  try {
    const pubKey = new PublicKey(walletAddress);
    // Use the connection object to get the transaction signatures for the address.
    const signatures = await connection.getSignaturesForAddress(pubKey, { limit });

    if (!signatures || signatures.length === 0) {
      return "No recent transactions found for this address.";
    }

    // Format the output as a Markdown list with links to the Solscan explorer.
    let historyText = "Here are your most recent transactions:\n\n";
    signatures.forEach((sigInfo, index) => {
      const signature = sigInfo.signature;
      const shortSig = `${signature.slice(0, 6)}...${signature.slice(-6)}`;
      historyText += `${index + 1}. [${shortSig}](https://solscan.io/tx/${signature})\n`;
    });

    return historyText;
  } catch (error) {
    console.error("🔥 getTransactionHistory.js failed:", error.message);
    return "Sorry, I was unable to fetch the transaction history.";
  }
}
