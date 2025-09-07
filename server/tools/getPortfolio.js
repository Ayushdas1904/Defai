// tools/getPortfolio.js
import fetch from "cross-fetch";

async function fetchTokenMetaFromDexScreener(mintAddress) {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`
    );
    if (!res.ok) {
      throw new Error(`DexScreener failed: ${res.status}`);
    }
    const data = await res.json();
    if (data.pairs && data.pairs.length > 0) {
      const pair = data.pairs[0];
      return {
        symbol: pair.baseToken?.symbol || mintAddress,
        name: pair.baseToken?.name || "",
      };
    }
    return { symbol: mintAddress, name: "" };
  } catch (err) {
    console.warn(`DexScreener lookup failed for ${mintAddress}:`, err.message);
    return { symbol: mintAddress, name: "" };
  }
}

export default async function getPortfolio({ walletAddress }) {
  console.log("💼 getPortfolio.js called with:", { walletAddress });
  try {
    const balanceRes = await fetch(
      `https://api.helius.xyz/v0/addresses/${walletAddress}/balances?api-key=${process.env.HELIUS_API_KEY}`
    ).then((r) => r.json());

    let portfolioText = "📊 Here's a snapshot of your portfolio:\n\n";
    let foundTokens = 0;

    // ✅ Native SOL balance
    if (balanceRes.nativeBalance) {
      const sol = balanceRes.nativeBalance / 1e9; // lamports → SOL
      if (sol > 0) {
        portfolioText += `* **SOL** (Solana): ${sol}\n`;
        foundTokens++;
      }
    }

    // ✅ SPL tokens
    if (balanceRes.tokens && balanceRes.tokens.length > 0) {
      for (const token of balanceRes.tokens) {
        const amount = token.amount / Math.pow(10, token.decimals || 0);
        if (amount > 0) {
          const meta = await fetchTokenMetaFromDexScreener(token.mint);
          portfolioText += `* **${meta.symbol}** (${meta.name}): ${amount}\n`;
          foundTokens++;
        }
      }
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
