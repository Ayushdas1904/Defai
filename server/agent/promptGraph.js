import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { GEMINI_FUNCTION_TOOLS, SYSTEM_INSTRUCTION } from './geminiTools.js';
import { executeToolCall } from './toolExecutor.js';
import { isQuotaOrRateLimitError } from './helpers.js';

const PromptState = Annotation.Root({
  prompt: Annotation(),
  history: Annotation(),
  walletAddress: Annotation(),
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

async function runGeminiStreamTurn({
  genAI,
  modelVersion,
  history,
  prompt,
  emit,
}) {
  const model = genAI.getGenerativeModel({
    model: modelVersion,
    tools: GEMINI_FUNCTION_TOOLS,
    systemInstruction: SYSTEM_INSTRUCTION,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
  });

  const chat = model.startChat({ history });
  const result = await chat.sendMessageStream(prompt);
  let pendingFunctionCall = null;
  let hasSentData = false;

  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    if (chunkText) {
      emit({ type: 'text', content: chunkText });
      hasSentData = true;
    }
    if (!pendingFunctionCall) {
      pendingFunctionCall = pickFirstFunctionCall(chunk.functionCalls());
    }
  }

  return { pendingFunctionCall, hasSentData };
}

export function createPromptGraphRunner({ emit }) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const llmNode = async (state) => {
    try {
      const primaryResult = await runGeminiStreamTurn({
        genAI,
        modelVersion: state.modelVersion,
        history: state.history,
        prompt: state.prompt,
        emit,
      });
      return primaryResult;
    } catch (error) {
      if (
        isQuotaOrRateLimitError(error) &&
        state.fallbackModel &&
        state.fallbackModel !== state.modelVersion
      ) {
        const fallbackResult = await runGeminiStreamTurn({
          genAI,
          modelVersion: state.fallbackModel,
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
      modelVersion: input.modelVersion,
      fallbackModel: input.fallbackModel,
      pendingFunctionCall: null,
      hasSentData: false,
    });
  };
}
