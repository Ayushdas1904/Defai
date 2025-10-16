// tools/getTokenComparison.js
import fetch from 'node-fetch';

export default async ({ token1, token2, days = 7 }) => {
  try {
    // Map Solana tokens to CoinGecko IDs
    const COINGECKO_IDS = {
      sol: "solana",
      usdc: "usd-coin",
      usdt: "tether",
      bonk: "bonk",
      jup: "jupiter-exchange-solana",
      btc: "bitcoin",
      eth: "ethereum",
      matic: "matic-network",
      avax: "avalanche-2",
      atom: "cosmos",
      dot: "polkadot",
      ada: "cardano",
      link: "chainlink",
      uni: "uniswap",
      aave: "aave",
      crv: "curve-dao-token",
      comp: "compound-governance-token",
      snx: "havven",
      mkr: "maker",
      yfi: "yearn-finance",
      vibey: "vibey-turtle",
    };

    const id1 = COINGECKO_IDS[token1.toLowerCase()];
    const id2 = COINGECKO_IDS[token2.toLowerCase()];

    if (!id1) throw new Error(`Unsupported token: ${token1}`);
    if (!id2) throw new Error(`Unsupported token: ${token2}`);

    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get price history for both tokens with retry logic
    const fetchWithRetry = async (url, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch(url);
          if (response.ok) return response;
          if (i === retries - 1) throw new Error(`HTTP ${response.status}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        } catch (error) {
          if (i === retries - 1) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    };

    const [token1Data, token2Data] = await Promise.all([
      fetchWithRetry(`https://api.coingecko.com/api/v3/coins/${id1}/market_chart?vs_currency=usd&days=${days}`),
      fetchWithRetry(`https://api.coingecko.com/api/v3/coins/${id2}/market_chart?vs_currency=usd&days=${days}`)
    ]);

    if (!token1Data.ok || !token2Data.ok) {
      throw new Error('Failed to fetch token data from CoinGecko');
    }

    const [token1Result, token2Result] = await Promise.all([
      token1Data.json(),
      token2Data.json()
    ]);

    // Validate response data
    if (!token1Result.prices || !token2Result.prices) {
      throw new Error('No price data found for one or both tokens');
    }

    // Extract prices and timestamps
    const token1Prices = token1Result.prices.map(([timestamp, price]) => price);
    const token2Prices = token2Result.prices.map(([timestamp, price]) => price);
    const timestamps = token1Result.prices.map(([timestamp]) => 
      new Date(timestamp).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      })
    );

    // Normalize prices to percentage change from first day (for fair comparison)
    const token1Normalized = normalizePrices(token1Prices);
    const token2Normalized = normalizePrices(token2Prices);

    return {
      token1: token1.toUpperCase(),
      token2: token2.toUpperCase(),
      days,
      timestamps,
      series: [
        {
          name: token1.toUpperCase(),
          data: token1Normalized,
          color: '#6366f1' // Default blue
        },
        {
          name: token2.toUpperCase(),
          data: token2Normalized,
          color: '#ef4444' // Default red
        }
      ]
    };
  } catch (error) {
    console.error('Token comparison error:', error);
    throw new Error(`Token comparison failed: ${error.message}`);
  }
};

// Normalize prices to percentage change from first day
function normalizePrices(prices) {
  if (!prices || prices.length === 0) return [];
  
  const firstPrice = prices[0];
  return prices.map(price => ((price - firstPrice) / firstPrice) * 100);
}
