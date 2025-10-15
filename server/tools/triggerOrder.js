// tools/triggerOrder.js
import fetch from "node-fetch";

// Token symbol → mint address and decimals mapping
const KNOWN_TOKENS = {
  SOL: { mint: "So11111111111111111111111111111111111111112", decimals: 9 },
  USDC: { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 },
  USDT: { mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6 },
  BONK: { mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", decimals: 5 },
  JUP: { mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", decimals: 6 },
};

// Search for token mint using Dexscreener API
async function searchTokenMint(tokenSymbol) {
  try {
    const url = `https://api.dexscreener.com/latest/dex/search/?q=${encodeURIComponent(tokenSymbol)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.pairs && data.pairs.length > 0) {
      // Return the first match's base token address
      return data.pairs[0].baseToken.address;
    }

    throw new Error(`Token ${tokenSymbol} not found`);
  } catch (error) {
    throw new Error(`Failed to find mint for ${tokenSymbol}: ${error.message}`);
  }
}

// Get token info (mint + decimals)
async function getTokenInfo(tokenSymbolOrMint) {
  const upper = tokenSymbolOrMint.toUpperCase();

  //  Check by symbol
  if (KNOWN_TOKENS[upper]) return KNOWN_TOKENS[upper];

  //  Check if input is a mint
  if (tokenSymbolOrMint.length === 44) {
    const known = Object.values(KNOWN_TOKENS).find(
      (t) => t.mint === tokenSymbolOrMint
    );
    if (known) return known;

    // Only fallback if truly unknown
    return { mint: tokenSymbolOrMint, decimals: 6 }; // safest default
  }

  //  Fallback: try to search via API
  const mint = await searchTokenMint(tokenSymbolOrMint);

  // If the mint is in KNOWN_TOKENS, use its decimals
  const known = Object.values(KNOWN_TOKENS).find((t) => t.mint === mint);
  if (known) return known;

  // Unknown token
  return { mint, decimals: 6 };
}


// Convert amount from units back to human-readable format
function convertFromUnits(amount, decimals) {
  return amount / Math.pow(10, decimals);
}

export async function getMintAddress(symbolOrMint) {
  // If it looks like a mint address (44 characters), return as-is
  if (symbolOrMint && symbolOrMint.length === 44) {
    return symbolOrMint;
  }

  try {
    const tokenInfo = await getTokenInfo(symbolOrMint);
    return tokenInfo.mint;
  } catch (error) {
    throw new Error(`Unknown token: ${symbolOrMint}. ${error.message}`);
  }
}

// Update createTriggerOrder to use async getMintAddress and handle decimals
async function createTriggerOrder({
  walletAddress,
  fromMint,
  toMint,
  makerAmount,
  takerAmount,
  slippageBps = 0,
  expiryUnix = null,
  wrapAndUnwrapSol = true,
}) {
  // Get token info for both tokens to get mint addresses and decimals
  const fromTokenInfo = await getTokenInfo(fromMint);
  const toTokenInfo = await getTokenInfo(toMint);

  // Convert amounts to proper decimal units
  const makerAmountUnits = Math.round(makerAmount * Math.pow(10, fromTokenInfo.decimals));
const takerAmountUnits = Math.round(takerAmount * Math.pow(10, toTokenInfo.decimals));

  const url = "https://lite-api.jup.ag/trigger/v1/createOrder";
  const body = {
    inputMint: fromTokenInfo.mint,
    outputMint: toTokenInfo.mint,
    maker: walletAddress,
    payer: walletAddress,
    params: {
      makingAmount: makerAmountUnits.toString(), // ✅ human-readable (0.03 SOL ≈ $5)
        takingAmount: takerAmountUnits.toString(),
      //Jupiter API expects slippageBps as a string
      slippageBps: String(slippageBps),
      ...(expiryUnix ? { expiredAtUnix: expiryUnix } : {}),
    },
    computeUnitPrice: "auto",
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const j = await resp.json();
  if (!resp.ok || j.error) {
    const errorText = typeof j.error === "object"
      ? JSON.stringify(j.error, null, 2)
      : j.error || `HTTP ${resp.status}`;

    throw new Error(`❌ ${errorText}`);
  }


  return j; // { transaction: unsignedBase64, orderId, ... }
}

async function executeTriggerOrder({ signedOrderTransactionBase64, orderId }) {
  const url = "https://lite-api.jup.ag/trigger/v1/execute";
  const body = { signedTransaction: signedOrderTransactionBase64 };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const j = await resp.json();
  if (!resp.ok || j.error) {
    console.error("Trigger Order Error:", j);
    throw new Error(JSON.stringify(j, null, 2));
  }


  return { ...j, orderId }; // return orderId for UI display
}

async function cancelTriggerOrder({ walletAddress, orderId }) {
  const url = "https://lite-api.jup.ag/trigger/v1/cancelOrders";
  const body = {
    maker: walletAddress,
    orders: [orderId],
    computeUnitPrice: "auto",
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const j = await resp.json();

  if (!resp.ok || j.error) {
    const errorText = typeof j.error === "object"
      ? JSON.stringify(j.error, null, 2)
      : j.error || `HTTP ${resp.status}`;
    throw new Error(`❌ ${errorText}`);
  }

  // j will contain { transaction: base64Unsigned, ... }
  return { ...j, orderId };
}

async function getTriggerOrders({ walletAddress }) {
  const url = `https://lite-api.jup.ag/trigger/v1/getTriggerOrders?user=${walletAddress}&orderStatus=active`;
  const resp = await fetch(url);
  const j = await resp.json();

  if (!resp.ok || j.error) throw new Error(j.error || `HTTP ${resp.status}`);
  return j; // list of orders
}

export {
  createTriggerOrder,
  executeTriggerOrder,
  cancelTriggerOrder,
  getTriggerOrders,
  convertFromUnits,
};
