// tools/getTokenPrice.js
import fetch from "cross-fetch";

// ---------- JUPITER ----------
async function fetchFromJupiter(mintAddress, tokenSymbol) {
  console.log("Attempting to fetch price from Jupiter...");
  const response = await fetch(`https://price.jup.ag/v6/price?ids=${mintAddress}`);
  if (!response.ok) {
    throw new Error(`Jupiter API failed with status: ${response.status}`);
  }
  const data = await response.json();
  const priceData = data.data[mintAddress];
  if (!priceData) {
    throw new Error(`Price data not found for ${tokenSymbol} in Jupiter response.`);
  }
  return `💰 The current price of ${priceData.mintSymbol} is $${priceData.price.toFixed(4)}.`;
}

// ---------- DEXSCREENER ----------
async function fetchFromDexScreener(mintAddress, tokenSymbol) {
  console.log("Trying DexScreener...");
  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`);
  if (!response.ok) {
    throw new Error(`DexScreener API failed with status: ${response.status}`);
  }
  const data = await response.json();

  if (!data.pairs || data.pairs.length === 0) {
    throw new Error(`DexScreener has no pairs for ${tokenSymbol}.`);
  }

  // pick most liquid pair
  const pair = data.pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
  const price = parseFloat(pair.priceUsd);

  if (!price) {
    throw new Error(`Price not found for ${tokenSymbol} on DexScreener.`);
  }

  const name = pair.baseToken?.symbol || tokenSymbol;
  return `💰 The current price of ${name} is $${price.toFixed(6)}.`;
}

// ---------- MAIN FUNCTION ----------
export default async function getTokenPrice({ tokenSymbol }) {
  console.log("📈 getTokenPrice.js called with:", { tokenSymbol });

  try {
    // Step 1: Try resolving symbol with Jupiter token list
    let mintAddress = null;
    let tokenInfo = null;

    try {
      const tokenListRes = await fetch("https://token.jup.ag/all");
      if (tokenListRes.ok) {
        const tokenList = await tokenListRes.json();
        tokenInfo = tokenList.find(
          (t) => t.symbol.toUpperCase() === tokenSymbol.toUpperCase()
        );
        if (tokenInfo) mintAddress = tokenInfo.address;
      }
    } catch (e) {
      console.warn("Could not fetch Jupiter token list:", e.message);
    }

    // Step 2: If not found in Jupiter list, assume input is already a mint address
    if (!mintAddress) {
      console.log(`"${tokenSymbol}" not found in Jupiter list — treating it as a mint address`);
      mintAddress = tokenSymbol; // user might have passed mint directly
    }

    // Step 3: Try Jupiter first
    try {
      if (tokenInfo) {
        return await fetchFromJupiter(mintAddress, tokenSymbol);
      } else {
        // If not in Jupiter's list, skip Jupiter and go straight to DexScreener
        return await fetchFromDexScreener(mintAddress, tokenSymbol);
      }
    } catch (jupiterError) {
      console.warn("Jupiter API failed:", jupiterError.message);

      // Step 4: Fallback to DexScreener
      try {
        return await fetchFromDexScreener(mintAddress, tokenSymbol);
      } catch (dexError) {
        console.error("DexScreener fallback also failed:", dexError.message);
        throw new Error("Both Jupiter and DexScreener price APIs failed.");
      }
    }
  } catch (error) {
    console.error("🔥 getTokenPrice.js failed:", error);

    return `❌ Failed to fetch price for ${tokenSymbol}: ${error.message}`;
  }
}
