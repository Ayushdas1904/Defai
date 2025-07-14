import { PromptBox } from "./ui/chatgpt-prompt-input";
import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import { useWallet } from "@solana/wallet-adapter-react";

const ChatUI = () => {
  const [messages, setMessages] = React.useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const { publicKey } = useWallet();

  const sendPrompt = async (value: string) => {
    if (!value.trim()) return;

    if (!publicKey) {
      alert("Please connect your wallet first.");
      return;
    }

    const fullPrompt = `${value}\n\n[walletPublicKey: ${publicKey.toString()}]`;

    const userMessage = { role: "user" as const, content: value };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8080/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullPrompt,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let aiMessage = "";

      while (true) {
        const { done, value: chunk } = await reader?.read() ?? {};
        if (done) break;
        aiMessage += decoder.decode(chunk);
        setMessages((prev) => {
          const newMessages = [...prev];
          if (newMessages[prev.length - 1]?.role === "ai") {
            newMessages[prev.length - 1].content = aiMessage;
          } else {
            newMessages.push({ role: "ai", content: aiMessage });
          }
          return [...newMessages];
        });
      }
    } catch (err) {
      console.error("Streaming error:", err);
    } finally {
      setLoading(false);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="w-full h-screen flex flex-col items-center">
      {!hasMessages && (
        <p className="text-center text-3xl text-foreground mt-20">
          How Can I Help You
        </p>
      )}

      {/* Messages display */}
      <div
        className={`w-full max-w-4xl flex flex-col gap-3 px-4 py-6 overflow-y-auto custom-scrollbar transition-all
        ${hasMessages ? "h-[calc(100vh-120px)] mb-28" : "h-0 overflow-hidden"}`}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={
              "max-w-[80%] rounded-xl p-3 whitespace-pre-wrap text-sm " +
              (msg.role === "user"
                ? "self-end bg-black text-white dark:bg-[#1a1a1a]"
                : "self-start bg-gray-200 text-black dark:bg-[#444] dark:text-white")
            }
          >
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
              {msg.content}
            </ReactMarkdown>
          </div>
        ))}
      </div>

      {/* PromptBox */}
      <div
        className={`w-full px-4 max-w-4xl transition-all ${hasMessages
          ? "fixed bottom-4 left-1/2 -translate-x-1/2"
          : "flex-1 flex items-center justify-center"
          }`}
      >
        <PromptBox
          onSubmitPrompt={sendPrompt}
          loading={loading}
          value={inputValue}
          setValue={setInputValue}
        />
      </div>
    </div>
  );
};

export default ChatUI;
