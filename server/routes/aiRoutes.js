// routes/aiRoutes.js
import express from 'express';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import dotenv from 'dotenv';

// --- NEW: Import the new tools ---
import getBalance from '../tools/getBalance.js';
import send from '../tools/send.js';
import swapTokens from '../tools/swapTokens.js';
import getPortfolio from '../tools/getPortfolio.js';
import getTokenPrice from '../tools/getTokenPrice.js';
import getTransactionHistory from '../tools/getTransactionHistory.js';

dotenv.config();
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- NEW: Add the new tool definitions ---
const tools = [
  {
    functionDeclarations: [
      // Existing tools
      {
        name: 'getBalance',
        description: 'Get the crypto balance for a single, specific token.',
        parameters: {
          type: 'OBJECT',
          properties: {
            tokenSymbol: {
              type: 'STRING',
              description: 'The symbol of the token to check, e.g., "SOL", "USDC".'
            },
          },
          required: ['tokenSymbol'],
        },
      },
      {
        name: 'send',
        description: 'Use this tool to send cryptocurrency to another wallet.',
        parameters: {
          type: 'OBJECT',
          properties: {
            toAddress: { type: 'STRING', description: 'The recipient\'s public wallet address.' },
            amount: { type: 'NUMBER', description: 'The quantity of the token to send.' },
            tokenSymbol: { type: 'STRING', description: 'The symbol of the token to send.' },
          },
          required: ['toAddress', 'amount', 'tokenSymbol'],
        },
      },
      {
        name: 'swapTokens',
        description: 'Use this tool to swap one cryptocurrency for another.',
        parameters: {
          type: 'OBJECT',
          properties: {
            fromToken: { type: 'STRING', description: 'The symbol of the token to sell.' },
            toToken: { type: 'STRING', description: 'The symbol of the token to buy.' },
            amount: { type: 'NUMBER', description: 'The amount of the `fromToken` to swap.' },
          },
          required: ['fromToken', 'toToken', 'amount'],
        },
      },
      // New Information Tools
      {
        name: 'getPortfolio',
        description: 'Get a snapshot of all the tokens and balances in the user\'s wallet using the Helius API. Use this for general questions like "what\'s in my wallet?".',
        parameters: { type: 'OBJECT', properties: {} }, // no input needed, wallet is passed automatically
      },
      {
        name: 'getTokenPrice',
        description: 'Get the current USD price of a specific cryptocurrency.',
        parameters: {
          type: 'OBJECT',
          properties: {
            tokenSymbol: {
              type: 'STRING',
              description: 'The symbol of the token to get the price for, e.g., "SOL".'
            },
          },
          required: ['tokenSymbol'],
        },
      },
      {
        name: 'getTransactionHistory',
        description: 'Fetch the most recent transaction history for the user\'s wallet.',
        parameters: {
          type: 'OBJECT',
          properties: {
            limit: {
              type: 'NUMBER',
              description: 'The number of recent transactions to fetch. Defaults to 5.'
            },
          },
        },
      },
    ],
  },
];

router.post('/prompt', async (req, res) => {
  const { prompt, history, walletAddress } = req.body;

  if (!prompt || !walletAddress) {
    return res.status(400).send({ error: 'Missing prompt or wallet address.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      tools,
      // --- THIS IS THE KEY CHANGE ---
      // The instruction is now less strict, allowing for general crypto questions.
      systemInstruction: "You are a helpful AI assistant specializing in DeFi and cryptocurrency, with a focus on the Solana ecosystem. Your primary role is to help users manage their crypto assets using the provided tools. You can answer questions about DeFi, blockchain technology, and specific cryptocurrencies. However, you must politely decline to answer questions that are completely unrelated to finance, cryptocurrency, or technology, such as questions about movies, history, or personal opinions.",
      // --- END OF KEY CHANGE ---
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(prompt);

    let hasSentData = false;

    for await (const chunk of result.stream) {
      console.log("--- Gemini Chunk Received ---");
      console.log(JSON.stringify(chunk, null, 2));
      console.log("--------------------------");
      hasSentData = true;

      const chunkText = chunk.text();
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ type: 'text', content: chunkText })}\n\n`);
      }

      const functionCalls = chunk.functionCalls();
      if (functionCalls?.length > 0) {
        const func = functionCalls[0];
        const { name, args } = func;

        try {
          // --- THIS IS THE KEY CHANGE ---
          // When a text-based tool is called, we now add an `isToolResponse` flag.
          if (name === 'getBalance') {
            const result = await getBalance({ ...args, publicKey: walletAddress });
            const resultText = `Your ${args.tokenSymbol} balance is ${result.balance}`;
            res.write(`data: ${JSON.stringify({ type: 'text', content: resultText, isToolResponse: true })}\n\n`);
          }
          else if (name === 'send') {
            const txArgs = await send({ ...args, fromAddress: walletAddress });
            res.write(`data: ${JSON.stringify({
              type: 'tool_code',
              content: { action: 'createAndSendTransaction', args: txArgs }
            })}\n\n`);
          }
          else if (name === 'swapTokens') {
            const { serializedTx } = await swapTokens({ ...args, walletAddress });
            res.write(`data: ${JSON.stringify({
              type: 'tool_code',
              content: { action: 'signAndSendTransaction', base64Tx: serializedTx }
            })}\n\n`);
          }
          else if (name === 'getPortfolio') {
            const resultText = await getPortfolio({ walletAddress });
            res.write(`data: ${JSON.stringify({ type: 'text', content: resultText, isToolResponse: true })}\n\n`);
          }
          else if (name === 'getTokenPrice') {
            const resultText = await getTokenPrice(args);
            res.write(`data: ${JSON.stringify({ type: 'text', content: resultText, isToolResponse: true })}\n\n`);
          }
          else if (name === 'getTransactionHistory') {
            const resultText = await getTransactionHistory({ ...args, walletAddress });
            res.write(`data: ${JSON.stringify({ type: 'text', content: resultText, isToolResponse: true })}\n\n`);
          }

        } catch (toolErr) {
          const errorMessage = toolErr instanceof Error ? toolErr.message : "An unknown tool error occurred.";
          console.error("Tool error:", errorMessage);
          res.write(`data: ${JSON.stringify({ type: 'error', content: errorMessage })}\n\n`);
        }
      }
    }

    if (!hasSentData) {
      console.log("Warning: Gemini stream finished without sending any text or tool calls.");
      res.write(`data: ${JSON.stringify({ type: 'text', content: "I'm not sure how to handle that request. Could you please rephrase it?" })}\n\n`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown Gemini API error occurred.";
    console.error('Gemini error:', errorMessage);
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'Gemini API error.' })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
