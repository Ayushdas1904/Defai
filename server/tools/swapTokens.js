// tools/swapTokens.js
import fetch from "cross-fetch";

const TOKEN_DATA = {
  SOL: { mint: "So11111111111111111111111111111111111111112", decimals: 9 },
  USDC: { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 },
  USDT: { mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6 },
  JUP: { mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", decimals: 6 },
};

export default async function swapTokens({ fromToken, toToken, amount, walletAddress }) {
  try {
    const from = TOKEN_DATA[fromToken.toUpperCase()];
    const to = TOKEN_DATA[toToken.toUpperCase()];
    if (!from || !to) throw new Error("Unsupported token.");

    const amountInSmallestUnit = Math.round(amount * Math.pow(10, from.decimals));

    // Step 1: Get quote
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${from.mint}&outputMint=${to.mint}&amount=${amountInSmallestUnit}&slippageBps=50`;
    const quoteResponse = await (await fetch(quoteUrl)).json();
    if (!quoteResponse || quoteResponse.error) throw new Error("Failed to fetch quote");

    // Step 2: Get swap transaction
    const swapResponse = await (
      await fetch("https://quote-api.jup.ag/v6/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey: walletAddress,
          wrapAndUnwrapSol: true,
        }),
      })
    ).json();

    if (!swapResponse.swapTransaction) throw new Error("Failed to get swap transaction");

    // Step 3: Return serialized tx
    return { serializedTx: swapResponse.swapTransaction };

  } catch (error) {
    console.error("swapTokens error:", error);
    throw error;
  }
}
