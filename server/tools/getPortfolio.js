// getPortfolio.js

let TOKEN_CACHE = null;

async function fetchTokenList() {
  if (TOKEN_CACHE) return TOKEN_CACHE;

  const response = await fetch("https://token.jup.ag/all");
  const tokens = await response.json();

  TOKEN_CACHE = {};
  tokens.forEach((t) => {
    TOKEN_CACHE[t.address] = { symbol: t.symbol, name: t.name };
  });

  return TOKEN_CACHE;
}

export default async function getPortfolio({ walletAddress }) {
  console.log("💼 getPortfolio.js called with:", { walletAddress });
  try {
    const [balanceRes, tokenMap] = await Promise.all([
      fetch(
        `https://api.helius.xyz/v0/addresses/${walletAddress}/balances?api-key=${process.env.HELIUS_API_KEY}`
      ).then((r) => r.json()),
      fetchTokenList()
    ]);

    let portfolioText = "📊 Here's a snapshot of your portfolio:\n\n";
    let foundTokens = 0;

    // ✅ Add Native SOL balance
    if (balanceRes.nativeBalance) {
      const sol = balanceRes.nativeBalance / 1e9; // lamports → SOL
      if (sol > 0) {
        portfolioText += `* **SOL** (Solana): ${sol}\n`;
        foundTokens++;
      }
    }

    // ✅ Add SPL tokens
    if (balanceRes.tokens && balanceRes.tokens.length > 0) {
      balanceRes.tokens.forEach((token) => {
        const amount = token.amount / Math.pow(10, token.decimals || 0);
        if (amount > 0) {
          const tokenMeta = tokenMap[token.mint] || {};
          const symbol = tokenMeta.symbol || token.symbol || token.mint;
          const name = tokenMeta.name || "";
          portfolioText += `* **${symbol}** (${name}): ${amount}\n`;
          foundTokens++;
        }
      });
    }

    if (foundTokens === 0) {
      return "I couldn’t find any tokens in your wallet.";
    }

    return portfolioText;
  } catch (error) {
    console.error("🔥 getPortfolio.js failed:", error.message);
    return "Sorry, I was unable to fetch your portfolio snapshot.";
  }
}
