// ChatUI.tsx
import { PromptBox } from "./ui/chatgpt-prompt-input";
import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

// --- Solana Imports ---
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL, VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';

// --- NEW: Icon for the tool response card ---
const ToolIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 12c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z"/>
    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
  </svg>
);

// --- NEW: A dedicated component for rendering tool responses ---
const ToolResponseCard = ({ content }: { content: string }) => (
  <div className="bg-gray-800 border border-purple-500/50 rounded-xl p-4 max-w-[80%] self-start">
    <div className="flex items-center gap-2 mb-2">
      <ToolIcon />
      <h3 className="font-bold text-purple-300">Tool Executed</h3>
    </div>
    <div className="prose prose-invert prose-sm">
      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{content}</ReactMarkdown>
    </div>
  </div>
);


// --- Type Definitions ---
type SendTxArgs = { toAddress: string; amount: number; tokenSymbol: string; }
type CreateAndSendContent = { action: 'createAndSendTransaction'; args: SendTxArgs; };
type SignAndSendContent = { action: 'signAndSendTransaction'; base64Tx: string; };
type ToolCallResult = CreateAndSendContent | SignAndSendContent;

// --- UPDATED: Message state to include a flag for tool responses ---
type Message = {
  role: "user" | "model";
  content: string;
  isToolResponse?: boolean; // Optional flag
};

// --- UPDATED: StreamData type to include the new flag ---
type StreamData =
  | { type: "text"; content: string; isToolResponse?: boolean; }
  | { type: "error"; content: string }
  | { type: "tool_code"; content: ToolCallResult };

const ChatUI = () => {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  // --- UPDATED: addMessage function to handle the new flag ---
  const addMessage = (role: "user" | "model", content: string, isToolResponse: boolean = false) => {
    setMessages((prev) => [...prev, { role, content, isToolResponse }]);
  };

  const handleCreateAndSend = async (toolResult: CreateAndSendContent) => {
    if (!connected || !publicKey || !sendTransaction) {
      addMessage('model', 'Wallet not connected or transaction sending is not available.', true);
      return;
    }
    const { args } = toolResult;    
    try {
      const lamportsToSend = args.amount * LAMPORTS_PER_SOL;
      const balance = await connection.getBalance(publicKey);
      const requiredBalance = lamportsToSend + 5000;
      if (balance < requiredBalance) {
        addMessage('model', `❌ Transaction failed: Insufficient funds. You need at least ${requiredBalance / LAMPORTS_PER_SOL} SOL, but you only have ${balance / LAMPORTS_PER_SOL} SOL.`, true);
        return;
      }

      addMessage('model', `Action required: Please approve the transaction in your wallet to send ${args.amount} ${args.tokenSymbol.toUpperCase()}.`);
      
      const toPubkey = new PublicKey(args.toAddress);
      const transferInstruction = SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: toPubkey, lamports: lamportsToSend });
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      const transaction = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey }).add(transferInstruction);
      const signature = await sendTransaction(transaction, connection);

      addMessage('model', `Transaction sent! Waiting for confirmation... \n\n[View on Solscan](https://solscan.io/tx/${signature}?cluster=devnet)`, true);
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'processed');
      addMessage('model', `✅ Transaction Confirmed!`, true);
    } catch (err: unknown) {
      console.error("Send transaction failed:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      addMessage('model', `❌ Transaction failed: ${errorMessage}`, true);
    }
  };
  
  const handleSignAndSend = async (toolResult: SignAndSendContent) => {
    if (!connected || !publicKey || !sendTransaction) {
      addMessage('model', 'Wallet not connected or transaction sending is not available.', true);
      return;
    }
    addMessage('model', `Action required: Please approve the swap transaction in your wallet.`);
    try {
      const transactionBuffer = Buffer.from(toolResult.base64Tx, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuffer);
      const signature = await sendTransaction(transaction, connection);

      addMessage('model', `Swap transaction sent! Waiting for confirmation... \n\n[View on Solscan](https://solscan.io/tx/${signature}?cluster=devnet)`, true);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'processed');
      addMessage('model', `✅ Swap Confirmed!`, true);
    } catch (err: unknown) {
      console.error("Swap transaction failed:", err);
      let errorMessage = "An unexpected error occurred. Please check the browser console for details.";
      if (err instanceof Error) {
        if (err.message.includes("reverted during simulation")) {
          errorMessage = "The wallet blocked this swap because it is likely invalid for the Devnet. This can happen with certain token pairs when testing.";
        } else if (err.message.includes("User rejected")) {
          errorMessage = "You cancelled the transaction in your wallet.";
        } else {
          errorMessage = err.message;
        }
      } else {
        try {
          errorMessage = `An unknown error object was received: ${JSON.stringify(err)}`;
        } catch {
          errorMessage = "An unknown and non-serializable error occurred.";
        }
      }
      addMessage('model', `❌ Swap failed: ${errorMessage}`, true);
    }
  };


  const sendPrompt = async (value: string) => {
    if (!value.trim()) return;
    if (!connected || !publicKey) {
      addMessage("model", "Please connect your wallet.", true);
      return;
    }

    const userMessage = { role: "user" as const, content: value };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setLoading(true);
    setInputValue("");

    const history = newMessages.slice(0, -1).map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));

    try {
      const res = await fetch("http://localhost:8080/api/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: value,
          history,
          walletAddress: publicKey.toString(),
        }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}: ${res.statusText}`);
      }
      if (!res.body) throw new Error("No response body");

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let currentModelMessage = "";
      setMessages((prev) => [...prev, { role: "model", content: "" }]);

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;

        const lines = chunk.split("\n\n").filter((line) => line.startsWith("data: "));
        for (const line of lines) {
          const jsonString = line.slice(6);
          try {
            const data: StreamData = JSON.parse(jsonString);

            // --- THIS IS THE KEY FIX ---
            // Removed the incorrect guessing logic and now rely on the flag from the backend.
            if (data.type === "text") {
              currentModelMessage += data.content;
              setMessages((prev) => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                lastMsg.content = currentModelMessage;
                // Only set the flag if the backend explicitly provides it.
                if (data.isToolResponse) {
                    lastMsg.isToolResponse = true;
                }
                return updated;
              });
            } else if (data.type === "tool_code") {
              if (data.content.action === 'createAndSendTransaction') {
                handleCreateAndSend(data.content);
              } else if (data.content.action === 'signAndSendTransaction') {
                handleSignAndSend(data.content);
              }
            } else if (data.type === "error") {
              addMessage("model", `[Error]: ${data.content}`, true);
            }
          } catch (e) {
            console.error("Stream parse error:", e);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      addMessage("model", `API error: ${msg}`, true);
    } finally {
      setLoading(false);
    }
  };

  const hasMessages = messages.length > 0;

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
          // --- UPDATED: Conditional rendering logic ---
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
