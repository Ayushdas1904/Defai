import express from 'express';
import dotenv from 'dotenv';
import { createPromptGraphRunner } from '../agent/promptGraph.js';
import { resolveModelConfig } from '../agent/modelProvider.js';

dotenv.config();
const router = express.Router();

// --- POST /prompt ---
router.post('/prompt', async (req, res) => {
  const { prompt, history, walletAddress } = req.body;
  if (!prompt || !walletAddress) return res.status(400).send({ error: 'Missing prompt or wallet address.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const runPromptGraph = createPromptGraphRunner({
      emit: (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
    });

    const modelConfig = resolveModelConfig({
      provider: process.env.LLM_PROVIDER,
      modelVersion: process.env.LLM_MODEL,
      fallbackModel: process.env.LLM_FALLBACK_MODEL,
    });

    const result = await runPromptGraph({
      prompt,
      history,
      walletAddress,
      modelProvider: modelConfig.provider,
      modelVersion: modelConfig.modelVersion,
      fallbackModel: modelConfig.fallbackModel,
    });

    if (!result?.hasSentData) {
      res.write(`data: ${JSON.stringify({ type: 'text', content: "I couldn't process that request. Try rephrasing." })}\n\n`);
    }

  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'Model API error.' })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
