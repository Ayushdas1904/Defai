import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { buildChatMessages, createChatModel, resolveModelConfig } from './modelProvider.js';
import { executeToolCall } from './toolExecutor.js';
import { isQuotaOrRateLimitError } from './helpers.js';

const PromptState = Annotation.Root({
  prompt: Annotation(),
  history: Annotation(),
  walletAddress: Annotation(),
  modelProvider: Annotation(),
  modelVersion: Annotation(),
  fallbackModel: Annotation(),
  pendingFunctionCall: Annotation(),
  hasSentData: Annotation({
    reducer: (left, right) => Boolean(left || right),
    default: () => false,
  }),
});

function pickFirstFunctionCall(calls) {
  if (!Array.isArray(calls) || calls.length === 0) return null;
  const call = calls[0];
  if (!call?.name) return null;
  return { name: call.name, args: call.args ?? {} };
}

async function runModelStreamTurn({ provider, modelVersion, history, prompt, emit }) {
  const model = createChatModel({ provider, modelVersion });
  const messages = buildChatMessages({ history, prompt });
  const result = await model.stream(messages);
  let accumulatedChunk = null;
  let pendingFunctionCall = null;
  let hasSentData = false;

  for await (const chunk of result) {
    const chunkText = chunk.text ?? '';
    if (chunkText) {
      emit({ type: 'text', content: chunkText });
      hasSentData = true;
    }
    accumulatedChunk = accumulatedChunk ? accumulatedChunk.concat(chunk) : chunk;
  }

  pendingFunctionCall = pickFirstFunctionCall(accumulatedChunk?.tool_calls);

  return { pendingFunctionCall, hasSentData };
}

export function createPromptGraphRunner({ emit }) {
  const llmNode = async (state) => {
    const modelConfig = resolveModelConfig({
      provider: state.modelProvider,
      modelVersion: state.modelVersion,
      fallbackModel: state.fallbackModel,
    });

    try {
      const primaryResult = await runModelStreamTurn({
        provider: modelConfig.provider,
        modelVersion: modelConfig.modelVersion,
        history: state.history,
        prompt: state.prompt,
        emit,
      });
      return primaryResult;
    } catch (error) {
      if (
        isQuotaOrRateLimitError(error) &&
        modelConfig.fallbackModel &&
        modelConfig.fallbackModel !== modelConfig.modelVersion
      ) {
        const fallbackResult = await runModelStreamTurn({
          provider: modelConfig.provider,
          modelVersion: modelConfig.fallbackModel,
          history: state.history,
          prompt: state.prompt,
          emit,
        });
        return fallbackResult;
      }
      throw error;
    }
  };

  const toolNode = async (state) => {
    const result = await executeToolCall({
      functionCall: state.pendingFunctionCall,
      walletAddress: state.walletAddress,
      emit,
    });
    return {
      pendingFunctionCall: null,
      hasSentData: result.didEmitData,
    };
  };

  const graph = new StateGraph(PromptState)
    .addNode('llm', llmNode)
    .addNode('tool', toolNode)
    .addEdge(START, 'llm')
    .addConditionalEdges('llm', (state) => (state.pendingFunctionCall ? 'tool' : END), {
      tool: 'tool',
      [END]: END,
    })
    .addEdge('tool', END)
    .compile();

  return async function runPromptGraph(input) {
    return graph.invoke({
      prompt: input.prompt,
      history: input.history,
      walletAddress: input.walletAddress,
        modelProvider: input.modelProvider,
      modelVersion: input.modelVersion,
      fallbackModel: input.fallbackModel,
      pendingFunctionCall: null,
      hasSentData: false,
    });
  };
}
