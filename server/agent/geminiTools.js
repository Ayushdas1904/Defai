export const SYSTEM_INSTRUCTION = 'You are a DeFi AI assistant specializing in Solana and crypto.';

export const GEMINI_FUNCTION_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'getBalance',
        description: 'Get the crypto balance for a specific token.',
        parameters: {
          type: 'OBJECT',
          properties: {
            tokenSymbol: { type: 'STRING', description: 'Token symbol e.g., SOL, USDC' },
          },
          required: ['tokenSymbol'],
        },
      },
      {
        name: 'send',
        description: 'Send cryptocurrency to another wallet.',
        parameters: {
          type: 'OBJECT',
          properties: {
            toAddress: { type: 'STRING', description: 'Recipient wallet address' },
            amount: { type: 'NUMBER', description: 'Amount to send' },
            tokenSymbol: { type: 'STRING', description: 'Token symbol to send' },
          },
          required: ['toAddress', 'amount', 'tokenSymbol'],
        },
      },
      {
        name: 'swapTokens',
        description: 'Swap one crypto for another on Solana.',
        parameters: {
          type: 'OBJECT',
          properties: {
            fromToken: { type: 'STRING', description: 'Token to sell (default SOL for buying)' },
            toToken: { type: 'STRING', description: 'Token to buy (default SOL for selling)' },
            amount: { type: 'NUMBER', description: 'Amount of fromToken to swap' },
          },
          required: ['toToken', 'amount'],
        },
      },
      {
        name: 'getPortfolio',
        description: 'Get all tokens and balances in the wallet.',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'getTokenPrice',
        description: 'Get current USD price of a specific token.',
        parameters: {
          type: 'OBJECT',
          properties: { tokenSymbol: { type: 'STRING', description: 'Token symbol, e.g., SOL' } },
          required: ['tokenSymbol'],
        },
      },
      {
        name: 'getTransactionHistory',
        description: 'Get recent transaction history for the wallet.',
        parameters: {
          type: 'OBJECT',
          properties: { limit: { type: 'NUMBER', description: 'Number of recent transactions (default 5)' } },
        },
      },
      {
        name: 'createTriggerOrder',
        description: 'Create a price trigger order for auto buy/sell.',
        parameters: {
          type: 'OBJECT',
          properties: {
            fromToken: { type: 'STRING' },
            toToken: { type: 'STRING' },
            makerAmount: { type: 'NUMBER' },
            takerAmount: { type: 'NUMBER' },
            slippageBps: { type: 'STRING' },
            expiry: { type: 'NUMBER' },
            walletAddress: { type: 'STRING' },
          },
          required: ['fromToken', 'toToken', 'makerAmount', 'takerAmount'],
        },
      },
      {
        name: 'executeTriggerOrder',
        description: 'Execute a signed trigger order transaction.',
        parameters: {
          type: 'OBJECT',
          properties: { signedOrderTransactionBase64: { type: 'STRING' }, orderId: { type: 'STRING' } },
          required: ['signedOrderTransactionBase64', 'orderId'],
        },
      },
      {
        name: 'cancelTriggerOrder',
        description: 'Cancel an existing trigger order.',
        parameters: {
          type: 'OBJECT',
          properties: { walletAddress: { type: 'STRING' }, orderId: { type: 'STRING' } },
          required: ['orderId'],
        },
      },
      {
        name: 'getTriggerOrders',
        description: 'Get all trigger orders for a wallet.',
        parameters: {
          type: 'OBJECT',
          properties: { walletAddress: { type: 'STRING' } },
        },
      },
      {
        name: 'getPriceHistory',
        description: 'Get historical USD price data for a token (used to plot charts).',
        parameters: {
          type: 'OBJECT',
          properties: {
            tokenSymbol: { type: 'STRING', description: 'Token symbol, e.g., SOL or USDC' },
            days: { type: 'NUMBER', description: 'Number of days of history (default 7)' },
          },
          required: ['tokenSymbol'],
        },
      },
      {
        name: 'getTokenComparison',
        description: 'Compare price performance of two tokens over time (normalized to percentage change).',
        parameters: {
          type: 'OBJECT',
          properties: {
            token1: { type: 'STRING', description: 'First token symbol, e.g., SOL' },
            token2: { type: 'STRING', description: 'Second token symbol, e.g., BTC' },
            days: { type: 'NUMBER', description: 'Number of days to compare (default 7)' },
          },
          required: ['token1', 'token2'],
        },
      },
      {
        name: 'getContact',
        description: 'Resolve a contact name to a wallet address.',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING', description: 'Name of the contact, e.g., Alice' },
          },
          required: ['name'],
        },
      },
      {
        name: 'addContact',
        description: 'Add a new contact name linked to a wallet address.',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            address: { type: 'STRING' },
          },
          required: ['name', 'address'],
        },
      },
      {
        name: 'removeContact',
        description: 'Remove an existing contact by name.',
        parameters: {
          type: 'OBJECT',
          properties: { name: { type: 'STRING' } },
          required: ['name'],
        },
      },
      {
        name: 'getContacts',
        description: 'Get all saved contacts.',
        parameters: { type: 'OBJECT', properties: {} },
      },
    ],
  },
];