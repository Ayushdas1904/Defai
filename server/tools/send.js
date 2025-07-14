import { tool } from 'ai';
import { z } from 'zod';

export const sendTool = tool({
  description: 'Send crypto assets to another address',
  inputSchema: z.object({
    to: z.string().describe('Recipient wallet address'),
    amount: z.number().describe('Amount of tokens to send'),
    token: z.string().describe('Token symbol (e.g., ETH, USDC)'),
  }),
  async execute({ to, amount, token }) {
    // TODO: Replace with actual wallet integration
    return `✅ Sent ${amount} ${token} to ${to}`;
  },
});
