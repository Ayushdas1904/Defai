import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const SYSTEM_INSTRUCTION = 'You are a DeFi AI assistant specializing in Solana and crypto.';

function createTool(name, description, schema) {
  return tool(async () => '', {
    name,
    description,
    schema,
  });
}

export const AGENT_TOOLS = [
  createTool(
    'getBalance',
    'Get the crypto balance for a specific token.',
    z.object({
      tokenSymbol: z.string().describe('Token symbol e.g., SOL, USDC'),
    })
  ),
  createTool(
    'send',
    'Send cryptocurrency to another wallet.',
    z.object({
      toAddress: z.string().describe('Recipient wallet address'),
      amount: z.number().describe('Amount to send'),
      tokenSymbol: z.string().describe('Token symbol to send'),
    })
  ),
  createTool(
    'swapTokens',
    'Swap one crypto for another on Solana.',
    z.object({
      fromToken: z.string().optional().describe('Token to sell (default SOL for buying)'),
      toToken: z.string().describe('Token to buy (default SOL for selling)'),
      amount: z.number().describe('Amount of fromToken to swap'),
    })
  ),
  createTool('getPortfolio', 'Get all tokens and balances in the wallet.', z.object({})),
  createTool(
    'getTokenPrice',
    'Get current USD price of a specific token.',
    z.object({
      tokenSymbol: z.string().describe('Token symbol, e.g., SOL'),
    })
  ),
  createTool(
    'getTransactionHistory',
    'Get recent transaction history for the wallet.',
    z.object({
      limit: z.number().optional().describe('Number of recent transactions (default 5)'),
    })
  ),
  createTool(
    'createTriggerOrder',
    'Create a price trigger order for auto buy/sell.',
    z.object({
      fromToken: z.string(),
      toToken: z.string(),
      makerAmount: z.number(),
      takerAmount: z.number(),
      slippageBps: z.string().optional(),
      expiry: z.number().optional(),
    })
  ),
  createTool(
    'executeTriggerOrder',
    'Execute a signed trigger order transaction.',
    z.object({
      signedOrderTransactionBase64: z.string(),
      orderId: z.string(),
    })
  ),
  createTool(
    'cancelTriggerOrder',
    'Cancel an existing trigger order.',
    z.object({
      orderId: z.string(),
    })
  ),
  createTool(
    'getTriggerOrders',
    'Get all trigger orders for a wallet.',
    z.object({})
  ),
  createTool(
    'getPriceHistory',
    'Get historical USD price data for a token (used to plot charts).',
    z.object({
      tokenSymbol: z.string().describe('Token symbol, e.g., SOL or USDC'),
      days: z.number().optional().describe('Number of days of history (default 7)'),
    })
  ),
  createTool(
    'getTokenComparison',
    'Compare price performance of two tokens over time (normalized to percentage change).',
    z.object({
      token1: z.string().describe('First token symbol, e.g., SOL'),
      token2: z.string().describe('Second token symbol, e.g., BTC'),
      days: z.number().optional().describe('Number of days to compare (default 7)'),
    })
  ),
  createTool(
    'getContact',
    'Resolve a contact name to a wallet address.',
    z.object({
      name: z.string().describe('Name of the contact, e.g., Alice'),
    })
  ),
  createTool(
    'addContact',
    'Add a new contact name linked to a wallet address.',
    z.object({
      name: z.string(),
      address: z.string(),
    })
  ),
  createTool(
    'removeContact',
    'Remove an existing contact by name.',
    z.object({
      name: z.string(),
    })
  ),
  createTool('getContacts', 'Get all saved contacts.', z.object({})),
];