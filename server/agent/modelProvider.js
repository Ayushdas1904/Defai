import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { AGENT_TOOLS, SYSTEM_INSTRUCTION } from './llmTools.js';

function normalizeProvider(provider) {
  return provider === 'openai' ? 'openai' : 'gemini';
}

export function resolveModelConfig({ provider, modelVersion, fallbackModel }) {
  const resolvedProvider = normalizeProvider(provider ?? process.env.LLM_PROVIDER);

  if (resolvedProvider === 'openai') {
    return {
      provider: resolvedProvider,
      modelVersion: modelVersion ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      fallbackModel:
        fallbackModel ?? process.env.OPENAI_FALLBACK_MODEL ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    };
  }

  return {
    provider: resolvedProvider,
    modelVersion: modelVersion ?? process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    fallbackModel:
      fallbackModel ?? process.env.GEMINI_FALLBACK_MODEL ?? process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  };
}

export function createChatModel({ provider, modelVersion }) {
  const resolvedProvider = normalizeProvider(provider);

  if (resolvedProvider === 'openai') {
    const model = new ChatOpenAI({
      model: modelVersion,
      temperature: 0,
      streaming: true,
      apiKey: process.env.OPENAI_API_KEY,
    });

    return model.bindTools(AGENT_TOOLS);
  }

  const model = new ChatGoogleGenerativeAI({
    model: modelVersion,
    temperature: 0,
    streaming: true,
    apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
  });

  return model.bindTools(AGENT_TOOLS);
}

export function buildChatMessages({ history = [], prompt }) {
  const messages = [new SystemMessage(SYSTEM_INSTRUCTION)];

  for (const entry of history) {
    if (!entry?.role || typeof entry.role !== 'string') {
      continue;
    }

    const text = typeof entry.content === 'string'
      ? entry.content
      : entry?.content?.title
        ? entry.content.title
        : '';

    if (!text.trim()) {
      continue;
    }

    if (entry.role === 'user') {
      messages.push(new HumanMessage(text));
    } else {
      messages.push(new AIMessage(text));
    }
  }

  messages.push(new HumanMessage(prompt));
  return messages;
}