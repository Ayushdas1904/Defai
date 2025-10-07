// tools/triggerOrder.js
import fetch from "node-fetch";

// Example helper: Token symbol → mint address mapping (you can expand this)
const tokenMints = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERGGGFhPqGhPuVjApbK9wq92B4YXm7wjC7",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
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

export async function getMintAddress(symbolOrMint) {
  // If it looks like a mint address (44 characters), return as-is
  if (symbolOrMint && symbolOrMint.length === 44) {
    return symbolOrMint;
  }

  const upperSymbol = symbolOrMint?.toUpperCase();

  // Check local mapping first (faster)
  if (tokenMints[upperSymbol]) {
    return tokenMints[upperSymbol];
  }

  // If not found locally, search via API
  try {
    const mintAddress = await searchTokenMint(symbolOrMint);

    // Cache the result for future use
    tokenMints[upperSymbol] = mintAddress;

    return mintAddress;
  } catch (error) {
    throw new Error(`Unknown token: ${symbolOrMint}. ${error.message}`);
  }
}

// Update createTriggerOrder to use async getMintAddress
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
  // Resolve mint addresses
  const resolvedFromMint = await getMintAddress(fromMint);
  const resolvedToMint = await getMintAddress(toMint);

  const url = "https://lite-api.jup.ag/trigger/v1/createOrder";
  const body = {
    inputMint: resolvedFromMint,
    outputMint: resolvedToMint,
    maker: walletAddress,
    payer: walletAddress,
    params: {
      makingAmount: makerAmount.toString(),
      takingAmount: takerAmount.toString(),
      slippageBps: slippageBps,
      ...(expiryUnix ? { expiredAtUnix: expiryUnix } : {}),
    },
    wrapAndUnwrapSol,
    computeUnitPrice: "auto",
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const j = await resp.json();
  if (!resp.ok || j.error) throw new Error(j.error || `HTTP ${resp.status}`);

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
  if (!resp.ok || j.error) throw new Error(j.error || `HTTP ${resp.status}`);

  return { ...j, orderId }; // return orderId for UI display
}

async function cancelTriggerOrder({ walletAddress, orderId }) {
  const url = "https://lite-api.jup.ag/trigger/v1/cancelOrder";
  const body = { owner: walletAddress, orderId };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const j = await resp.json();
  if (!resp.ok || j.error) throw new Error(j.error || `HTTP ${resp.status}`);

  return { ...j, orderId };
}

async function getTriggerOrders({ walletAddress }) {
  const url = `https://lite-api.jup.ag/trigger/v1/getTriggerOrders?owner=${walletAddress}`;
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
};
