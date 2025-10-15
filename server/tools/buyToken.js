import fetch from "node-fetch";
import { Connection } from "@solana/web3.js";

/**
 * Search token mint using Dexscreener API by token name
 */
async function getTokenMintByName(tokenName) {
  const url = `https://api.dexscreener.com/latest/dex/tokens?q=${encodeURIComponent(tokenName)}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.pairs || data.pairs.length === 0) {
    throw new Error(`No token found for name: ${tokenName}`);
  }

  // Pick first match (you can improve by fuzzy matching or asking user to choose)
  const tokenInfo = data.pairs[0];
  return tokenInfo.baseToken.address; // Solana mint address
}

/**
 * Buy a token using Jupiter Aggregator API
 * @param {Object} params
 * @param {string} params.wallet - User wallet public key (base58)
 * @param {string} params.tokenName - Name of token to buy (e.g., USDC)
 * @param {number} params.amount - Amount of SOL to spend (lamports)
 */
export async function buyToken({ wallet, tokenName, amount }) {
  try {
    const connection = new Connection("https://api.mainnet-beta.solana.com");

    // ✅ Step 1: Resolve token mint from Dexscreener
    const outputMint = await getTokenMintByName(tokenName);

    // ✅ Step 2: Use SOL as input mint
    const inputMint = "So11111111111111111111111111111111111111112"; // Wrapped SOL

    // ✅ Step 3: Get best quote from Jupiter
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`;
    const quoteRes = await fetch(quoteUrl);
    const quote = await quoteRes.json();

    if (!quote.data || quote.data.length === 0) {
      return { error: "No route found for this swap." };
    }

    const bestRoute = quote.data[0];

    // ✅ Step 4: Build swap transaction
    const swapRes = await fetch("https://quote-api.jup.ag/v6/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: bestRoute,
        userPublicKey: wallet,
        wrapAndUnwrapSol: true,
      }),
    });

    const swapData = await swapRes.json();

    if (!swapData.swapTransaction) {
      return { error: "Failed to build swap transaction." };
    }

    // ✅ Step 5: Return result
    return {
      message: `Prepared swap: ${(bestRoute.inAmount / 1e9).toFixed(3)} SOL → ${(bestRoute.outAmount / Math.pow(10, bestRoute.outDecimals)).toFixed(3)} ${tokenName}`,
      transaction: swapData.swapTransaction, // base64 tx
      tokenMint: outputMint,
      routeInfo: {
        input: bestRoute.inAmount,
        output: bestRoute.outAmount,
        outToken: tokenName,
      },
    };
  } catch (err) {
    return { error: err.message };
  }
}
