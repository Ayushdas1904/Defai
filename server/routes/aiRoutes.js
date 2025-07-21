// routes/aiRoutes.js
import express from 'express';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import dotenv from 'dotenv';
import getBalance from '../tools/getBalance.js';
import send from '../tools/send.js';
import swapTokens from '../tools/swap.js';

dotenv.config();
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const tools = [
  {
    functionDeclarations: [
      {
        name: 'getBalance',
        description: 'Get the crypto balance of the connected wallet for a specific token.',
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
        // --- THIS IS THE KEY CHANGE (1/2) ---
        // Added a direct example in the description to help the model match the prompt.
        description: 'Use this tool to send cryptocurrency. It prepares a transaction to send a specified amount of a token (like SOL) to a recipient\'s wallet address. For example, handles prompts like "send 1 sol to...".',
        parameters: {
          type: 'OBJECT',
          properties: {
            toAddress: {
              type: 'STRING',
              description: 'The recipient\'s public wallet address (e.g., "CGJut...33bD").'
            },
            amount: {
              type: 'NUMBER',
              description: 'The quantity of the token to send (e.g., 0.5, 1, 10).'
            },
            tokenSymbol: {
              type: 'STRING',
              description: 'The symbol or ticker of the token to send (e.g., "sol", "usdc").'
            },
          },
          required: ['toAddress', 'amount', 'tokenSymbol'],
        },
      },
      {
        name: 'swapTokens',
        description: 'Prepares a transaction to swap one token for another on a decentralized exchange.',
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
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(prompt);

    let hasSentData = false; // Flag to check if we've sent any response

    for await (const chunk of result.stream) {
      // --- THIS IS THE KEY CHANGE (2/2) ---
      // Added detailed logging to your backend terminal.
      // This will show you exactly what the AI is thinking for every chunk.
      console.log("--- Gemini Chunk Received ---");
      console.log(JSON.stringify(chunk, null, 2));
      console.log("--------------------------");

      hasSentData = true; // Mark that we received something from the AI

      const chunkText = chunk.text();
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ type: 'text', content: chunkText })}\n\n`);
      }

      const functionCalls = chunk.functionCalls();
      if (functionCalls?.length > 0) {
        const func = functionCalls[0];
        const { name, args } = func;

        try {
          if (name === 'getBalance') {
            const result = await getBalance({ ...args, publicKey: walletAddress });
            const resultText = `Your ${args.tokenSymbol} balance is ${result.balance}`;
            res.write(`data: ${JSON.stringify({ type: 'text', content: resultText })}\n\n`);
          }
          else if (name === 'send') {
            const txArgs = await send({ ...args, fromAddress: walletAddress });
            res.write(`data: ${JSON.stringify({
              type: 'tool_code',
              content: {
                action: 'createAndSendTransaction',
                args: txArgs,
              }
            })}\n\n`);
          }
          else if (name === 'swapTokens') {
            const swap = await swapTokens({ ...args, walletAddress });
            const resultText = `Swap prepared: ${swap}`;
            res.write(`data: ${JSON.stringify({ type: 'text', content: resultText })}\n\n`);
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
