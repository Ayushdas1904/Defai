// tools/getTokenPrice.js
import fetch from 'cross-fetch';

// Helper function to try fetching from Jupiter
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

// Helper function to try fetching from CoinGecko as a fallback
async function fetchFromCoinGecko(mintAddress, tokenSymbol) {
  console.log("Jupiter failed, falling back to CoinGecko...");
  let url;
  // CoinGecko uses a special ID for native SOL
  if (tokenSymbol.toUpperCase() === 'SOL') {
    url = `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd`;
  } else {
    url = `https://api.coingecko.com/api/v3/simple/token_price/solana?contract_addresses=${mintAddress}&vs_currencies=usd`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CoinGecko API failed with status: ${response.status}`);
  }
  const data = await response.json();
  
  let price;
  if (tokenSymbol.toUpperCase() === 'SOL') {
    price = data.solana?.usd;
  } else {
    price = data[mintAddress]?.usd;
  }

  if (price === undefined) {
    throw new Error(`Price data not found for ${tokenSymbol} in CoinGecko response.`);
  }

  return `💰 The current price of ${tokenSymbol.toUpperCase()} is $${price.toFixed(4)}.`;
}


export default async function getTokenPrice({ tokenSymbol }) {
  console.log("📈 getTokenPrice.js called with:", { tokenSymbol });

  try {
    // Step 1: Fetch token list to resolve symbol to mint address (this is a good common step)
    const tokenListRes = await fetch("https://token.jup.ag/all");
    if (!tokenListRes.ok) {
      throw new Error(`Failed to fetch token list: ${tokenListRes.statusText}`);
    }
    const tokenList = await tokenListRes.json();
    const tokenInfo = tokenList.find(t => t.symbol.toUpperCase() === tokenSymbol.toUpperCase());

    if (!tokenInfo) {
      return `❌ Token symbol "${tokenSymbol}" not found in Jupiter's token list.`;
    }
    const mintAddress = tokenInfo.address;

    // Step 2: Try Jupiter first, then fallback to CoinGecko
    try {
      return await fetchFromJupiter(mintAddress, tokenSymbol);
    } catch (jupiterError) {
      console.warn("Jupiter API failed:", jupiterError.message);
      try {
        return await fetchFromCoinGecko(mintAddress, tokenSymbol);
      } catch (coingeckoError) {
        console.error("CoinGecko fallback also failed:", coingeckoError.message);
        // If both fail, throw a generic error to be caught by the final catch block.
        throw new Error("Both Jupiter and CoinGecko price APIs failed.");
      }
    }

  } catch (error) {
    console.error("🔥 getTokenPrice.js failed:", error);

    if (error instanceof Error) {
        if (error.message.includes('ENOTFOUND')) {
            return "⚠️ Network error (DNS lookup failed). Please check your server's internet connection and DNS settings.";
        }
        // Return the more specific error message from the nested try-catch blocks if available
        return `❌ Failed to fetch price for ${tokenSymbol}: ${error.message}`;
    }

    return `❌ Failed to fetch price for ${tokenSymbol}. Please try again.`;
  }
}
