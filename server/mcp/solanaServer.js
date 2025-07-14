// solana-server.ts
import { createToolServer, tool } from '@ai-sdk/mcp';
import { Connection, PublicKey } from '@solana/web3.js';
import { z } from 'zod';

// Tool Definition
const getBalance = tool({
  name: 'getBalance',
  description: 'Returns the SOL balance of a given public key on devnet',
  inputSchema: z.object({
    walletPublicKey: z.string().describe('Solana wallet public key'),
  }),
  execute: async ({ walletPublicKey }) => {
    try {
      const connection = new Connection('https://api.devnet.solana.com');
      const balance = await connection.getBalance(new PublicKey(walletPublicKey));
      return `${balance / 1e9} SOL`;
    } catch (err) {
      return `Error fetching balance: ${err.message}`;
    }
  },
});

// Start MCP Tool Server
createToolServer({
  tools: [getBalance],
});
