// tools/getPortfolio.js
import getBalance from './getBalance.js'; // We will reuse your existing getBalance tool.

// A predefined list of common tokens to check for a portfolio snapshot.
const TOKENS_TO_CHECK = ['SOL', 'USDC', 'USDT', 'JUP'];

export default async function getPortfolio({ walletAddress }) {
  console.log("💼 getPortfolio.js called with:", { walletAddress });
  try {
    let portfolioText = "Here's a snapshot of your portfolio:\n\n";
    let foundTokens = 0;
    
    // Loop through our list of tokens and get the balance for each one.
    for (const token of TOKENS_TO_CHECK) {
      try {
        const result = await getBalance({ publicKey: walletAddress, tokenSymbol: token });
        // Only display tokens where the user has a balance greater than 0.
        if (result.balance > 0) {
          portfolioText += `* **${token}:** ${result.balance.toFixed(4)}\n`;
          foundTokens++;
        }
      } catch (e) {
        // This will often fail if the user doesn't have a token account for a specific token.
        // We can safely ignore these errors for a portfolio snapshot.
        console.log(`Could not get balance for ${token}, likely no token account exists.`);
      }
    }

    if (foundTokens === 0) {
        return "I couldn't find any balances for SOL, USDC, USDT, or JUP in your wallet.";
    }
    
    return portfolioText;
  } catch (error) {
    console.error("🔥 getPortfolio.js failed:", error.message);
    return "Sorry, I was unable to fetch your portfolio snapshot.";
  }
}
