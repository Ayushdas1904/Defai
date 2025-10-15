// ChatUI.tsx
import { PromptBox } from "./ui/chatgpt-prompt-input";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { useEffect, useRef, useState } from "react";
import { Copy, Check, Bot } from "lucide-react"; // ✅ Added User and Bot icons
import { useChatLogic } from "../hooks/useChatLogic";
import { ToolResponseCard } from "../components/ToolResponeCard";
import ToolShortcut from "./ToolShortcut";

const ChatUI = () => {
  const { messages, loading, inputValue, setInputValue, sendPrompt, connected } =
    useChatLogic();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const hasMessages = messages.length > 0;

  // --- Copy state for each message ---
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000); // reset after 2s
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {!hasMessages && (
        <p className="text-center text-3xl text-foreground mt-20">
          How Can I Help You?
        </p>
      )}

      {/* --- Messages Container --- */}
      <div
        ref={messagesContainerRef}
        className={`w-full max-w-3xl flex flex-col gap-3 px-4 py-6 overflow-y-auto custom-scrollbar transition-all ${
          hasMessages ? "h-[calc(100vh-190px)] mb-28" : "h-0 overflow-hidden"
        }`}
      >
        {messages.map((msg, i) => {
          if (msg.isToolResponse) {
            return <ToolResponseCard key={i} content={msg.content} />;
          }

          const isUser = msg.role === "user";

          return (
            <div
              key={i}
              className={`flex items-start gap-2 max-w-[80%] ${
                isUser ? "self-end flex-row-reverse" : "self-start"
              }`}
            >
              {/* Avatar Icon */}
              {/* <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  isUser
                    ? "bg-purple-700 text-white"
                    : "bg-gray-600 text-white"
                }`}
              >
                {isUser ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div> */}

              {/* Message Content + Copy Button Container */}
              <div
                className={`flex items-start gap-2 group ${
                  isUser ? "flex-row-reverse" : ""
                }`}
              >
                {/* Message Content */}
                <div
                  className={`rounded-3xl p-4 whitespace-pre-wrap text-sm ${
                    isUser
                      ? "bg-gray-100 text-white dark:bg-[#807f7f] rounded-tr-sm"
                      : "bg-gray-200 text-black dark:bg-[#626060] dark:text-white rounded-tl-sm"
                  }`}
                >
                  <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {/* Copy Button */}
                <button
                  onClick={() => handleCopy(msg.content, i)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-500/20 flex-shrink-0 mt-1"
                >
                  {copiedIndex === i ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {/* Loading dots */}
        {loading && (
          <div className="self-start flex items-start gap-2">
            {/* AI Avatar for loading state */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            {/* Loading animation */}
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* --- Input + Tools --- */}
      <div
        className={`w-full px-4 gap-5 max-w-3xl transition-all ${
          hasMessages
            ? "fixed flex flex-col bottom-4 left-1/2 -translate-x-1/2"
            : "flex-1 flex flex-col items-center justify-center"
        }`}
      >
        <PromptBox
          onSubmitPrompt={sendPrompt}
          loading={loading}
          value={inputValue}
          setValue={setInputValue}
          placeholder={
            connected ? "e.g., Send 0.1 SOL to..." : "Connect your wallet"
          }
          disabled={!connected || loading}
        />
        <ToolShortcut setInputValue={setInputValue} />
      </div>
    </div>
  );
};

export default ChatUI;
