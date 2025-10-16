// routes/aiRoutes.js
import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

import getBalance from '../tools/getBalance.js';
import send from '../tools/send.js';
import swapTokens from '../tools/swapTokens.js';
import getPortfolio from '../tools/getPortfolio.js';
import getTokenPrice from '../tools/getTokenPrice.js';
import getTransactionHistory from '../tools/getTransactionHistory.js';
import { createTriggerOrder, executeTriggerOrder, cancelTriggerOrder, getTriggerOrders, getMintAddress } from '../tools/triggerOrder.js';

dotenv.config();
const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Tools for Gemini ---
const tools = [
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
      // Trigger Orders
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
          //do not include walletAddress in the required parameters as it is already tracked.
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
    ]
  }
];

// --- POST /prompt ---
router.post('/prompt', async (req, res) => {
  const { prompt, history, walletAddress } = req.body;
  if (!prompt || !walletAddress) return res.status(400).send({ error: 'Missing prompt or wallet address.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      tools,
      systemInstruction: "You are a DeFi AI assistant specializing in Solana and crypto.",
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
      const chunkText = chunk.text();
      hasSentData = true;

      if (chunkText) res.write(`data: ${JSON.stringify({ type: 'text', content: chunkText })}\n\n`);

      const functionCalls = chunk.functionCalls();
      if (!functionCalls?.length) continue;

      const func = functionCalls[0];
      const { name, args } = func;

      try {
        switch (name) {
          case 'getBalance': {
            const bal = await getBalance({ ...args, publicKey: walletAddress });
            res.write(`data: ${JSON.stringify({ type: 'text', content: `Your ${args.tokenSymbol} balance is ${bal.balance}`, isToolResponse: true })}\n\n`);
            break;
          }
          case 'send': {
            const txArgs = await send({ ...args, fromAddress: walletAddress });
            res.write(`data: ${JSON.stringify({ type: 'tool_code', content: { action: 'createAndSendTransaction', args: txArgs } })}\n\n`);
            break;
          }
          case 'swapTokens': {
            const { serializedTx } = await swapTokens({ ...args, walletAddress });
            res.write(`data: ${JSON.stringify({ type: 'tool_code', content: { action: 'signAndSendTransaction', base64Tx: serializedTx } })}\n\n`);
            break;
          }
          case 'getPortfolio': {
            const portfolio = await getPortfolio({ walletAddress });
            res.write(`data: ${JSON.stringify({ type: 'text', content: portfolio, isToolResponse: true })}\n\n`);
            break;
          }
          case 'getTokenPrice': {
            const price = await getTokenPrice(args);
            res.write(`data: ${JSON.stringify({ type: 'text', content: price, isToolResponse: true })}\n\n`);
            break;
          }
          case 'getTransactionHistory': {
            const history = await getTransactionHistory({ ...args, walletAddress });
            res.write(`data: ${JSON.stringify({ type: 'text', content: history, isToolResponse: true })}\n\n`);
            break;
          }
          case 'createTriggerOrder': {
            const result = await createTriggerOrder({
              walletAddress: walletAddress,
              fromMint: await getMintAddress(args.fromToken),
              toMint: await getMintAddress(args.toToken),
              makerAmount: args.makerAmount,
              takerAmount: args.takerAmount,
              slippageBps: args.slippageBps,
              expiryUnix: args.expiry
            });
            res.write(`data: ${JSON.stringify({ type: 'tool_code', content: { action: 'signAndSendTransaction', base64Tx: result.transaction, orderId: result.orderId } })}\n\n`);
            res.write(`data: ${JSON.stringify({ type: 'text', content: `✅ Trigger order created: Order ID ${result.orderId}`, isToolResponse: true })}\n\n`);
            break;
          }
          case 'executeTriggerOrder': {
            await executeTriggerOrder(args);
            res.write(`data: ${JSON.stringify({ type: 'text', content: `🚀 Trigger order executed: Order ID ${args.orderId}`, isToolResponse: true })}\n\n`);
            break;
          }
          case "cancelTriggerOrder": {
            try {
              const cancelTx = await cancelTriggerOrder({
                walletAddress,
                orderId: args.orderId,
              });

              res.write(`data: ${JSON.stringify({
                type: "tool_code",
                content: {
                  action: 'signAndSendTransaction',
                  base64Tx: cancelTx.transaction,
                  orderId: args.orderId
                }
              })}\n\n`);
            } catch (err) {
              const message = (err && err.message) ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
              res.write(`data: ${JSON.stringify({
                type: "error",
                content: `Cancel order failed: ${message}`,
              })}\n\n`);
            }
            break;
          }

          case 'getTriggerOrders': {
            const { orders } = await getTriggerOrders({ walletAddress });

            if (!orders || orders.length === 0) {
              res.write(`data: ${JSON.stringify({
                type: 'text',
                content: "⚠️ No active trigger orders found.",
                isToolResponse: true,
              })}\n\n`);
              break;
            }

            const mintMap = {
              "So11111111111111111111111111111111111111112": "SOL",
              "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
              // add more mappings if needed
            };

            const formatted = orders.map((o) => {
              const inputToken = mintMap[o.inputMint] || o.inputMint;
              const outputToken = mintMap[o.outputMint] || o.outputMint;
              return `Order ID: ${o.orderKey}\n➡️ Selling ${inputToken} to buy ${outputToken}`;
            }).join("\n\n");

            res.write(`data: ${JSON.stringify({
              type: 'text',
              content: `📋 Found ${orders.length} active trigger order(s):\n\n${formatted}\n\nWhich order do you want to cancel? Please provide the Order ID.`,
              isToolResponse: true,
            })}\n\n`);
            break;
          }


          default:
            res.write(`data: ${JSON.stringify({ type: 'error', content: `Unknown tool: ${name}` })}\n\n`);
        }
      } catch (toolErr) {
        res.write(`data: ${JSON.stringify({ type: 'error', content: toolErr.message || 'Tool error' })}\n\n`);
      }
    }

    if (!hasSentData) {
      res.write(`data: ${JSON.stringify({ type: 'text', content: "I couldn't process that request. Try rephrasing." })}\n\n`);
    }

  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'Gemini API error.' })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
