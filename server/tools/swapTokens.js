// tools/swapTokens.js
import fetch from "node-fetch";

const KNOWN_TOKENS = {
  SOL: { mint: "So11111111111111111111111111111111111111112", decimals: 9 },
  USDC: { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 },
  USDT: { mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6 },
  JUP: { mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", decimals: 6 },
};

// Search unknown tokens on Dexscreener
async function getTokenMintByName(tokenName) {
  const url = `https://api.dexscreener.com/latest/dex/tokens?q=${encodeURIComponent(tokenName)}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.pairs || data.pairs.length === 0) {
    throw new Error(`Token "${tokenName}" not found`);
  }
  return data.pairs[0].baseToken.address;
}

// Get token info (mint + decimals)
async function getTokenInfo(tokenSymbol) {
  const upper = tokenSymbol.toUpperCase();
  if (KNOWN_TOKENS[upper]) return KNOWN_TOKENS[upper];

  const mint = await getTokenMintByName(tokenSymbol);
  return { mint, decimals: 6 }; // default 6 decimals if unknown
}

export default async function swapTokens({ fromToken, toToken, amount, walletAddress }) {
  try {
    // Auto-default fromToken to SOL if not provided
    if (!fromToken && toToken) {
      fromToken = "SOL";
      console.log(`⚡ Defaulting fromToken to SOL for buying ${amount} ${toToken}`);
    }

    if (!fromToken || !toToken || !amount) {
      throw new Error("Missing required swap parameters: fromToken, toToken, or amount");
    }

    console.log("🔄 swapTokens called:", { fromToken, toToken, amount, walletAddress });

    const fromInfo = await getTokenInfo(fromToken);
    const toInfo = await getTokenInfo(toToken);

    const amountUnits = Math.round(amount * Math.pow(10, fromInfo.decimals));

    // 1) Fetch quote
    const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${fromInfo.mint}&outputMint=${toInfo.mint}&amount=${amountUnits}&slippageBps=50`;
    const quoteResponse = await fetch(quoteUrl);
    const quoteJson = await quoteResponse.json();

    if (!quoteJson || quoteJson.error) {
      throw new Error("Failed to fetch quote from Jupiter Lite API");
    }

    // 2) Fetch swap transaction
    const swapUrl = "https://lite-api.jup.ag/swap/v1/swap";
    const swapResponse = await fetch(swapUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quoteJson,
        userPublicKey: walletAddress,
        wrapAndUnwrapSol: true,
      }),
    });
    const swapJson = await swapResponse.json();

    if (!swapJson || !swapJson.swapTransaction) {
      console.error("Swap API response:", swapJson);
      throw new Error("Failed to get swap transaction from Jupiter Lite API");
    }

    return {
      serializedTx: swapJson.swapTransaction,
      quote: quoteJson,
      from: fromToken,
      to: toToken,
      amountUnits,
    };
  } catch (err) {
    console.error("🔥 swapTokens failed:", err.message);
    throw err;
  }
}
