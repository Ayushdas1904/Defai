import fetch from "node-fetch";

// Use CoinGecko’s free API (no key needed)
export default async function getPriceHistory({ tokenSymbol, days = 7 }) {
  try {
    const symbol = tokenSymbol.toLowerCase();

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

    const id = COINGECKO_IDS[symbol];
    if (!id) throw new Error(`Unsupported token: ${tokenSymbol}`);

    const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
    
    // Add retry logic for rate limiting
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

    const res = await fetchWithRetry(url);
    const data = await res.json();

    if (!data.prices) throw new Error("No price data found");

    const timestamps = data.prices.map(p => new Date(p[0]).toLocaleDateString());
    const prices = data.prices.map(p => p[1]);

    return { tokenSymbol, days, timestamps, prices };
  } catch (err) {
    console.error("Price history error:", err);
    throw new Error(`Failed to fetch price history for ${tokenSymbol}`);
  }
}
