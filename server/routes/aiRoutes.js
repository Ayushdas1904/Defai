import express from 'express';
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { createOllama } from 'ollama-ai-provider';

const router = express.Router();

router.post('/chat', async (req, res) => {
  const { prompt } = req.body;

  try {
    const ollama = createOllama({
      baseURL: process.env.OLLAMA_URL || 'http://localhost:11434/api',
    });

    const { textStream } = streamText({
      model: ollama('mistral:latest'),
      system: 'You are a helpful assistant.',
      prompt,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of textStream) {
      res.write(chunk);
    }

    res.end();
  } catch (err) {
    console.error('Streaming error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
