// ChatUI.tsx
import { PromptBox } from "./ui/chatgpt-prompt-input";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

// --- Step 1: Import the new components and hooks ---
import { useChatLogic } from "../hooks/useChatLogic";
import { ToolResponseCard } from "../components/ToolResponeCard"

const ChatUI = () => {
  // --- Step 2: Use the custom hook to get all state and logic ---
  const { messages, loading, inputValue, setInputValue, sendPrompt, connected } = useChatLogic();

  const hasMessages = messages.length > 0;

  // --- Step 3: The JSX is now much cleaner and focused only on rendering ---
  return (
    <div className="w-full h-screen flex flex-col items-center">
      {!hasMessages && (
        <p className="text-center text-3xl text-foreground mt-20">
          How Can I Help You?
        </p>
      )}
      <div
        className={`w-full max-w-4xl flex flex-col gap-3 px-4 py-6 overflow-y-auto custom-scrollbar transition-all ${hasMessages ? "h-[calc(100vh-120px)] mb-28" : "h-0 overflow-hidden"}`}
      >
        {messages.map((msg, i) => {
          // Conditional rendering logic is now much simpler
          if (msg.isToolResponse) {
            return <ToolResponseCard key={i} content={msg.content} />;
          }
          return (
            <div
              key={i}
              className={`max-w-[80%] rounded-xl p-3 whitespace-pre-wrap text-sm ${msg.role === "user" ? "self-end bg-purple-700 text-white" : "self-start bg-gray-200 text-black dark:bg-[#444] dark:text-white"}`}
            >
              <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                {msg.content}
              </ReactMarkdown>
            </div>
          );
        })}
        {loading && (
          <div className="self-start flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
          </div>
        )}
      </div>
      <div
        className={`w-full px-4 max-w-4xl transition-all ${hasMessages ? "fixed bottom-4 left-1/2 -translate-x-1/2" : "flex-1 flex items-center justify-center"}`}
      >
        <PromptBox
          onSubmitPrompt={sendPrompt}
          loading={loading}
          value={inputValue}
          setValue={setInputValue}
          placeholder={connected ? "e.g., Send 0.1 SOL to..." : "Connect your wallet"}
          disabled={!connected || loading}
        />
      </div>
    </div>
  );
};

export default ChatUI;
