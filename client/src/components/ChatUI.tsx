// ChatUI.tsx
import { PromptBox } from "./ui/chatgpt-prompt-input";
import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

// --- Solana Imports ---
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// --- Type Definitions ---
// The raw arguments needed to build the transaction on the frontend
type SendTxArgs = {
  toAddress: string;
  amount: number;
  tokenSymbol: string;
}

// The specific action for the frontend to perform
type CreateAndSendContent = {
  action: 'createAndSendTransaction';
  args: SendTxArgs;
};

// A union type for any possible tool call result from the backend
type ToolCallResult = CreateAndSendContent;

// Type for the data chunks coming from the backend stream
type StreamData =
  | { type: "text"; content: string }
  | { type: "error"; content: string }
  | { type: "tool_code"; content: ToolCallResult };

const ChatUI = () => {
  const [messages, setMessages] = React.useState<
    { role: "user" | "model"; content: string }[]
  >([]);
  const [loading, setLoading] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  // --- Solana Wallet Adapter Hooks ---
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const addMessage = (role: "user" | "model", content: string) => {
    setMessages((prev) => [...prev, { role, content }]);
  };

  // --- UPDATED: Function to create and sign transactions on the frontend ---
  const handleCreateAndSend = async (toolResult: CreateAndSendContent) => {
    if (!connected || !publicKey || !sendTransaction) {
      addMessage('model', 'Wallet not connected or transaction sending is not available.');
      return;
    }

    const { args } = toolResult;
    
    try {
      // --- NEW: Pre-flight balance check ---
      const lamportsToSend = args.amount * LAMPORTS_PER_SOL;
      const balance = await connection.getBalance(publicKey);
      
      // Add a small buffer for the transaction fee
      const requiredBalance = lamportsToSend + 5000; // 5000 lamports is the default fee

      if (balance < requiredBalance) {
        addMessage('model', `❌ Transaction failed: Insufficient funds. You need at least ${requiredBalance / LAMPORTS_PER_SOL} SOL to complete this transaction, but you only have ${balance / LAMPORTS_PER_SOL} SOL.`);
        return;
      }
      // --- END of Pre-flight check ---

      addMessage('model', `Action required: Please approve the transaction in your wallet to send ${args.amount} ${args.tokenSymbol.toUpperCase()}.`);
      
      // 1. Build the transaction instruction
      const toPubkey = new PublicKey(args.toAddress);
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: toPubkey,
        lamports: lamportsToSend,
      });

      // 2. Fetch a fresh blockhash right before creating the transaction
      console.log("Fetching latest blockhash...");
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      console.log("Blockhash fetched:", blockhash);

      // 3. Create the transaction object with the fresh blockhash
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: publicKey,
      }).add(transferInstruction);

      // 4. Use the wallet adapter to send the transaction
      const signature = await sendTransaction(transaction, connection);
      addMessage('model', `Transaction sent! Waiting for confirmation... \n\n[View on Solscan](https://solscan.io/tx/${signature}?cluster=devnet)`);
      
      // 5. Confirm the transaction (simplified and more robust method)
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'processed');
      
      addMessage('model', `✅ Transaction Confirmed!`);

    } catch (err: unknown) {
      console.error("Transaction failed:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      addMessage('model', `❌ Transaction failed: ${errorMessage}`);
    }
  };

  const sendPrompt = async (value: string) => {
    if (!value.trim()) return;
    if (!connected || !publicKey) {
      addMessage("model", "Please connect your wallet.");
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
      // --- THIS IS THE KEY CHANGE ---
      // Corrected the port to 8080 to match your likely server configuration.
      const res = await fetch("http://localhost:8080/api/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: value,
          history,
          walletAddress: publicKey.toString(),
        }),
      });

      // --- NEW: Added error handling for bad HTTP responses ---
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}: ${res.statusText}`);
      }
      // --- END of new error handling ---

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

            if (data.type === "text") {
              currentModelMessage += data.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1].content = currentModelMessage;
                return updated;
              });
            } else if (data.type === "tool_code") {
              // When a tool_code message arrives, call the new handler function
              if (data.content.action === 'createAndSendTransaction') {
                handleCreateAndSend(data.content);
              }
            } else if (data.type === "error") {
              addMessage("model", `[Error]: ${data.content}`);
            }
          } catch (e) {
            console.error("Stream parse error:", e);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      addMessage("model", `API error: ${msg}`);
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
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[80%] rounded-xl p-3 whitespace-pre-wrap text-sm ${msg.role === "user" ? "self-end bg-purple-700 text-white" : "self-start bg-gray-200 text-black dark:bg-[#444] dark:text-white"}`}
          >
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
              {msg.content}
            </ReactMarkdown>
          </div>
        ))}
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

// import { PromptBox } from "./ui/chatgpt-prompt-input";
// import React from "react";
// import ReactMarkdown from "react-markdown";
// import rehypeHighlight from 'rehype-highlight';
// import 'highlight.js/styles/github.css';
// import { useWallet } from "@solana/wallet-adapter-react";

// const ChatUI = () => {
//   const [messages, setMessages] = React.useState<{ role: "user" | "ai"; content: string }[]>([]);
//   const [loading, setLoading] = React.useState(false);
//   const [inputValue, setInputValue] = React.useState("");
//   const { publicKey } = useWallet();

//   const sendPrompt = async (value: string) => {
//     if (!value.trim()) return;

//     if (!publicKey) {
//       alert("Please connect your wallet first.");
//       return;
//     }

//     const fullPrompt = `${value}\n\n[walletPublicKey: ${publicKey.toString()}]`;

//     const userMessage = { role: "user" as const, content: value };
//     setMessages((prev) => [...prev, userMessage]);
//     setLoading(true);

//     try {
//       const res = await fetch("http://localhost:8080/api/chat", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           prompt: fullPrompt,
//         }),
//       });

//       const reader = res.body?.getReader();
//       const decoder = new TextDecoder("utf-8");
//       let aiMessage = "";

//       while (true) {
//         const { done, value: chunk } = await reader?.read() ?? {};
//         if (done) break;
//         aiMessage += decoder.decode(chunk);
//         setMessages((prev) => {
//           const newMessages = [...prev];
//           if (newMessages[prev.length - 1]?.role === "ai") {
//             newMessages[prev.length - 1].content = aiMessage;
//           } else {
//             newMessages.push({ role: "ai", content: aiMessage });
//           }
//           return [...newMessages];
//         });
//       }
//     } catch (err) {
//       console.error("Streaming error:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const hasMessages = messages.length > 0;

//   return (
//     <div className="w-full h-screen flex flex-col items-center">
//       {!hasMessages && (
//         <p className="text-center text-3xl text-foreground mt-20">
//           How Can I Help You
//         </p>
//       )}

//       {/* Messages display */}
//       <div
//         className={`w-full max-w-4xl flex flex-col gap-3 px-4 py-6 overflow-y-auto custom-scrollbar transition-all
//         ${hasMessages ? "h-[calc(100vh-120px)] mb-28" : "h-0 overflow-hidden"}`}
//       >
//         {messages.map((msg, i) => (
//           <div
//             key={i}
//             className={
//               "max-w-[80%] rounded-xl p-3 whitespace-pre-wrap text-sm " +
//               (msg.role === "user"
//                 ? "self-end bg-black text-white dark:bg-[#1a1a1a]"
//                 : "self-start bg-gray-200 text-black dark:bg-[#444] dark:text-white")
//             }
//           >
//             <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
//               {msg.content}
//             </ReactMarkdown>
//           </div>
//         ))}
//       </div>

//       {/* PromptBox */}
//       <div
//         className={`w-full px-4 max-w-4xl transition-all ${hasMessages
//           ? "fixed bottom-4 left-1/2 -translate-x-1/2"
//           : "flex-1 flex items-center justify-center"
//           }`}
//       >
//         <PromptBox
//           onSubmitPrompt={sendPrompt}
//           loading={loading}
//           value={inputValue}
//           setValue={setInputValue}
//         />
//       </div>
//     </div>
//   );
// };

// export default ChatUI;
