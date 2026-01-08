// src/hooks/useChatLogic.ts
import React from 'react';
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL, VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import type { Message, StreamData, CreateAndSendContent, SignAndSendContent, ChartData } from '../types';


export const useChatLogic = () => {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const addMessage = (role: "user" | "model", content: string | ChartData, isToolResponse: boolean = false) => {
    setMessages(prev => [...prev, { role, content, isToolResponse }]);
  };

  const handleCreateAndSend = async (toolResult: CreateAndSendContent) => {
    if (!connected || !publicKey || !sendTransaction) {
      addMessage('model', 'Wallet not connected or transaction sending is not available.', true);
      return;
    }

    const { args } = toolResult;
    try {
      // Only SOL transfers handled here
      const lamportsToSend = Number(args.amount) * LAMPORTS_PER_SOL;
      const balance = await connection.getBalance(publicKey);

      const requiredBalance = lamportsToSend + 5000;
      if (balance < requiredBalance) {
        addMessage(
          'model',
          `❌ Transaction failed: Insufficient funds. You need at least ${requiredBalance / LAMPORTS_PER_SOL} SOL, but you only have ${balance / LAMPORTS_PER_SOL} SOL.`,
          true
        );
        return;
      }

      addMessage(
        'model',
        `Action required: Please approve the transaction in your wallet to send ${args.amount} ${args.tokenSymbol.toUpperCase()}.`
      );

      const toPubkey = new PublicKey(args.toAddress);
      const transferInstruction = SystemProgram.transfer({ fromPubkey: publicKey, toPubkey, lamports: lamportsToSend });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      const transaction = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey }).add(transferInstruction);

      const signature = await sendTransaction(transaction, connection);
      addMessage('model', `Transaction sent! Waiting for confirmation...\n\n[View on Solscan](https://solscan.io/tx/${signature})`, true);
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'processed');
      addMessage('model', `✅ Transaction Confirmed!`, true);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      addMessage('model', `❌ Transaction failed: ${errorMessage}`, true);
    }
  };

  const handleSignAndSend = async (toolResult: SignAndSendContent) => {
    if (!connected || !publicKey || !sendTransaction) {
      addMessage('model', 'Wallet not connected or transaction sending is not available.', true);
      return;
    }

    try {
      // Enhanced wallet prompt message
      if (toolResult.orderId) {
        addMessage('model', `🛑 **Cancel Order Request**\nOrder ID: ${toolResult.orderId}\n\nPlease approve the cancellation transaction in your wallet.`, true);
      } else {
        addMessage('model', `Action required: Please approve the swap/trigger order transaction in your wallet.`);
      }

      const transactionBuffer = Buffer.from(toolResult.base64Tx, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuffer);

      const signature = await sendTransaction(transaction, connection);

      // Transaction sent message
      if (toolResult.orderId) {
        addMessage('model', `🟢 **Cancellation Transaction Sent**\nOrder ID: ${toolResult.orderId}\n\n[View on Solscan](https://solscan.io/tx/${signature})`, true);
      } else {
        addMessage('model', `Swap/Trigger transaction sent! Waiting for confirmation...\n\n[View on Solscan](https://solscan.io/tx/${signature})`, true);
      }

      // Wait for confirmation
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'processed');

      // Final confirmation
      if (toolResult.orderId) {
        addMessage('model', `✅ **Order Successfully Cancelled**\nOrder ID: ${toolResult.orderId}`, true);
      } else {
        addMessage('model', `✅ Transaction Confirmed!`, true);
      }

    } catch (err) {
      let errorMessage = "An unexpected error occurred.";
      if (err instanceof Error) {
        if (err.message.includes("User rejected")) {
          errorMessage = "You cancelled the transaction in your wallet.";
        } else {
          errorMessage = err.message;
        }
      }
      
      if (toolResult.orderId) {
        addMessage('model', `❌ **Order Cancellation Failed**\nOrder ID: ${toolResult.orderId}\nError: ${errorMessage}`, true);
      } else {
        addMessage('model', `❌ Transaction failed: ${errorMessage}`, true);
      }
    }
  };

  const sendPrompt = async (value: string) => {
    if (!value.trim() || !connected || !publicKey) return;

    const userMessage = { role: "user" as const, content: value };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setInputValue("");

    const history = messages.map(msg => ({ role: msg.role, parts: [{ text: msg.content }] }));

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: value, history, walletAddress: publicKey.toString() }),
      });

      if (!res.ok) throw new Error(`Server responded with ${res.status}: ${res.statusText}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let currentModelMessage = "";
      setMessages(prev => [...prev, { role: "model", content: "" }]);

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;

        const lines = chunk.split("\n\n").filter(line => line.startsWith("data: "));
        for (const line of lines) {
          try {
            const data: StreamData = JSON.parse(line.slice(6));
            if (data.type === "text") {
              currentModelMessage += data.content;
              setMessages(prev => {
                const updated = [...prev];
                const lastMsg = { ...updated[updated.length - 1] };
                lastMsg.content = currentModelMessage;
                if (data.isToolResponse) lastMsg.isToolResponse = true;
                updated[updated.length - 1] = lastMsg;
                return updated;
              });
            } else if (data.type === "chart") {
              addMessage("model", data.content, true);
            } else if (data.type === "tool_code") {
              if (data.content.action === 'createAndSendTransaction') handleCreateAndSend(data.content);
              else if (data.content.action === 'signAndSendTransaction') handleSignAndSend(data.content);
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

  return { messages, loading, inputValue, setInputValue, sendPrompt, connected };
};
