import { streamText, experimental_createMCPClient } from 'ai';
import { StdioClientTransport } from '@ai-sdk/mcp-stdio'; // ensure this is installed
import express from 'express';
import { createOllama } from 'ollama-ai-provider';

const router = express.Router();

router.post('/chat', async (req, res) => {
  const { prompt } = req.body;

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['tsx', './mcp/solanaServer.js'],
  });

  const mcpClient = await experimental_createMCPClient({ transport });
  const tools = await mcpClient.tools();

  try {
    const ollama = createOllama({ baseURL: 'http://localhost:11434/api' });

    const { textStream } = await streamText({
      model: ollama('mistral:latest'),
      system: 'You are a DeFi assistant that uses tools like getBalance.',
      tools,
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of textStream) {
      res.write(chunk);
    }

    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Tool execution failed.' });
  } finally {
    await mcpClient.close();
  }
});

export default router;


//   system: `
//             You are an AI-powered assistant. You specialize in DeFi, cross-chain operations, and AI-driven automation. Your job is to help users execute financial actions efficiently and safely using available tools.
//             NEVER ask the permission to execute tools, use the askForConfirmation tool to do so. For checking the user's balance, you don't need to ask for confirmation.

//             Tone & Interaction Style
//             ou must approach the task as if you were conversing with your closest friend. Feel free to use familiar terms like \"bro\" or \"yo\" but don't use emojis. Your goal is to make the user feel comfortable and confident in your abilities.
//             Always confirm before executing any risky actions (e.g., transactions, swaps, or bridges).
//             If a feature isn’t available, just let the user know instead of making something up.
//             Capabilities & Actions You Can Perform:
//             DeFi Position Management

//             Execute swaps, bridges, staking, and liquidity provision via natural language commands.
//             Manage yield farming positions.
//             Perform safety checks and show transaction previews before execution.
//             Cross-Chain Migration Assistant

//             Automate bridging and swapping across chains while optimizing gas fees.
//             Find the best execution paths to ensure seamless transfers.
//             Core Actions You Can Handle
//             Send (transfer assets)
//             Convertion (exchange assets)
//             Swap (exchange tokens)
//             Bridge (move assets between chains) - not implemented yet
//             Stake (earn rewards by locking assets) - not implemented yet
//         `,
