// tools/getTokenPrice.js
import fetch from "cross-fetch";

// --- Search by name/symbol ---
async function resolveMintFromDexScreener(query) {
  console.log(`🔎 Searching DexScreener for "${query}"...`);
  const response = await fetch(
    `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`
  );
  if (!response.ok) throw new Error(`DexScreener search failed: ${response.status}`);

  const data = await response.json();
  if (!data.pairs || data.pairs.length === 0) {
    throw new Error(`No tokens found for "${query}"`);
  }

  // Pick most liquid pair
  const pair = data.pairs.sort(
    (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
  )[0];

  return {
    mintAddress: pair.baseToken?.address,
    symbol: pair.baseToken?.symbol || query,
  };
}

// --- Get price from DexScreener using mint ---
async function fetchFromDexScreener(mintAddress, tokenSymbol) {
  const response = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`
  );
  if (!response.ok) throw new Error(`DexScreener API failed: ${response.status}`);

  const data = await response.json();
  if (!data.pairs || data.pairs.length === 0) {
    throw new Error(`No price data for ${tokenSymbol}`);
  }

  // pick most liquid pair
  const pair = data.pairs.sort(
    (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
  )[0];
  const price = parseFloat(pair.priceUsd);

  if (!price) throw new Error(`Price not found for ${tokenSymbol}`);

  return `💰 The current price of ${pair.baseToken.symbol} is $${price.toFixed(6)}.`;
}

// --- Main function ---
export default async function getTokenPrice({ tokenSymbol }) {
  console.log("📈 getTokenPrice.js called with:", { tokenSymbol });

  try {
    // Step 1: Resolve symbol/name → mint
    const { mintAddress, symbol } = await resolveMintFromDexScreener(tokenSymbol);

    // Step 2: Fetch price by mint
    return await fetchFromDexScreener(mintAddress, symbol);
  } catch (error) {
    console.error("🔥 getTokenPrice.js failed:", error.message);
    return `❌ Failed to fetch price for ${tokenSymbol}: ${error.message}`;
  }
}
