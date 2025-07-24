// tools/swapTokens.js
import fetch from 'cross-fetch';

// Updated to include decimal information for each token
const TOKEN_DATA = {
  'SOL': {
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9
  },
  'USDC': {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6
  },
  'USDT': {
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    decimals: 6
  },
  'JUP': {
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6
  },
};

// Main function for the swap tool
export default async function swapTokens({ fromToken, toToken, amount, walletAddress }) {
  console.log("🔄 swapTokens.js called with:", { fromToken, toToken, amount, walletAddress });

  try {
    // 1. Get Token Data
    const fromTokenData = TOKEN_DATA[fromToken.toUpperCase()];
    const toTokenData = TOKEN_DATA[toToken.toUpperCase()];

    if (!fromTokenData || !toTokenData) {
      throw new Error("❌ Unsupported token. This agent currently supports SOL, USDC, USDT, and JUP.");
    }

    // 2. Calculate amount based on the correct decimals
    const amountInSmallestUnit = Math.round(amount * Math.pow(10, fromTokenData.decimals));
    console.log(`Calculated amount in smallest unit (${fromTokenData.decimals} decimals): ${amountInSmallestUnit}`);

    // 3. Get the best quote from Jupiter API
    console.log(`Getting quote for ${amount} ${fromToken} -> ${toToken}...`);
    
    // --- THIS IS THE KEY FIX ---
    // Added `onlyDirectRoutes=true` to the API call. This is more reliable for Devnet
    // as it prevents complex routes that might involve mainnet-only programs.
    const quoteApiUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${fromTokenData.mint}&outputMint=${toTokenData.mint}&amount=${amountInSmallestUnit}&slippageBps=50&onlyDirectRoutes=true`;
    // --- END OF KEY FIX ---

    console.log("Fetching quote from:", quoteApiUrl);
    
    const quoteResponse = await (await fetch(quoteApiUrl)).json();
    
    if (!quoteResponse || quoteResponse.error) {
        console.error("Jupiter Quote API Error:", quoteResponse.error);
        throw new Error(`❌ Unable to get a quote for this swap: ${quoteResponse.error || 'Unknown error'}`);
    }
    console.log("✅ Quote received:", quoteResponse);

    // 4. Get the serialized transaction for the swap
    console.log("Getting swap transaction...");
    const swapResponse = await (await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            quoteResponse,
            userPublicKey: walletAddress,
            wrapAndUnwrapSol: true, // Automatically handle wrapped SOL
        })
    })).json();

    if (!swapResponse.swapTransaction) {
        console.error("Jupiter Swap API Error:", swapResponse);
        throw new Error("❌ Failed to get swap transaction from Jupiter API.");
    }
    console.log("✅ Swap transaction received.");

    // 5. Return the serialized transaction
    return {
      serializedTx: swapResponse.swapTransaction
    };

  } catch (error) {
    console.error("🔥 swapTokens.js failed:", error.message);
    throw error;
  }
}
