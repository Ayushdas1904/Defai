// src/components/ToolResponseCard.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import Chart from "./ui/chart";
import type { ChartData } from '../types';
import { ChevronDown, ChevronUp } from "lucide-react";
import PortfolioUI from "../components/toolUI/PortfolioUI";

// Types for structured portfolio
interface PortfolioRow {
  token: string;
  name: string;
  balance: string;
}

// Icon map
const ToolIcon = ({ toolName }: { toolName: string }) => {
  const icons: { [key: string]: string } = {
    'Check Balance': '💰',
    'Portfolio Snapshot': '💼',
    'Token Price': '📈',
    'Price Chart': '📊',
    'Token Comparison': '📊',
    'Transaction History': '📜',
    'Transaction Status': '✅',
    'Trigger Order': '🎯',
    'Contact': '👤',
    'Error': '❌',
  };
  return <span className="text-2xl">{icons[toolName] || '⚙️'}</span>;
};

export const ToolResponseCard = ({ content }: { content: string | ChartData }) => {
  const [showFullResult, setShowFullResult] = React.useState(false);

  const parseContent = (): {
    toolName: string;
    status: string;
    mainContent: string | ChartData | PortfolioRow[];
  } => {
    let toolName = "Agent Response";
    let status = "Completed";
    let mainContent: string | ChartData | PortfolioRow[] = content;

    // 🔹 Chart support
    if (typeof content === 'object' && content.labels && (content.values || content.series)) {
      toolName = content.series ? "Token Comparison" : "Price Chart";
      status = "Chart generated";
      return { toolName, status, mainContent };
    }

    // 🔹 Text parsing
    if (typeof content === 'string') {
      // Balance
      const balanceMatch = content.match(/Your (.*) balance is (.*)/);
      if (balanceMatch) {
        toolName = "Check Balance";
        status = "Data retrieved successfully";
        mainContent = `**${balanceMatch[2]}**`;
        return { toolName, status, mainContent };
      }

      // Price
      const priceMatch = content.match(/The current price of (.*) is \$(.*)\.?/);
      if (priceMatch) {
        toolName = "Token Price";
        status = "Data retrieved successfully";
        mainContent = `**$${priceMatch[2]}**`;
        return { toolName, status, mainContent };
      }

      // 🔹 Portfolio Snapshot → parse bullet-point list
      if (content.startsWith("📊 Here's a snapshot")) {
        toolName = "Portfolio Snapshot";
        status = "Data retrieved successfully";

        const rows = content
          .split("\n")
          .filter((line) => line.trim().startsWith("*"))
          .map((line) => {
            // Example line: * **SOL** (Solana): 0.638991447
            const match = line.match(/\*\s+\*\*(.*?)\*\*\s+\((.*?)\):\s+(.*)/);
            return match
              ? {
                  token: match[1],
                  name: match[2],
                  balance: match[3],
                }
              : { token: "-", name: "-", balance: "-" };
          });

        mainContent = rows;
        return { toolName, status, mainContent };
      }

      // Tx History
      if (content.startsWith("Here are your most recent")) {
        toolName = "Transaction History";
        status = "Data retrieved successfully";
        mainContent = content.replace("Here are your most recent transactions:\n\n", "");
        return { toolName, status, mainContent };
      }

      // Tx Status
      if (content.includes("Transaction Confirmed")) {
        toolName = "Transaction Status";
        status = "Transaction Confirmed";
        mainContent = "The transaction was successfully confirmed on the network.";
        return { toolName, status, mainContent };
      }

      // Trigger Orders
      if (content.startsWith("✅ Trigger order created")) {
        toolName = "Trigger Order";
        status = "Order created successfully";
        mainContent = content.replace("✅ Trigger order created: ", "");
        return { toolName, status, mainContent };
      }
      if (content.includes("🛑 Cancel request for Order ID")) {
        toolName = "Trigger Order";
        status = "Cancel request initiated";
        mainContent = content;
        return { toolName, status, mainContent };
      }
      if (content.includes("✅ Order Cancelled")) {
        toolName = "Trigger Order";
        status = "Order cancelled successfully";
        mainContent = content;
        return { toolName, status, mainContent };
      }
      if (content.startsWith("📋")) {
        toolName = "Trigger Order";
        status = "Active orders retrieved";
        mainContent = content.replace("📋 ", "");
        return { toolName, status, mainContent };
      }

      // Errors
      if (content.startsWith("❌")) {
        toolName = "Error";
        status = "An error occurred";
        mainContent = content.replace("❌ ", "");
        return { toolName, status, mainContent };
      }

      // Contacts
      if (content.startsWith("Contact") && content.includes("→")) {
        toolName = "Contact";
        status = "Contact found";
        mainContent = content;
        return { toolName, status, mainContent };
      }
      if (content.startsWith("✅") && (content.includes("Added") || content.includes("Removed"))) {
        toolName = "Contact";
        status = "Contact updated";
        mainContent = content.replace("✅ ", "");
        return { toolName, status, mainContent };
      }
      if (content.startsWith("📋")) {
        toolName = "Contact";
        status = "Contacts retrieved";
        mainContent = content.replace("📋 ", "");
        return { toolName, status, mainContent };
      }
      if (content.includes("No contact found")) {
        toolName = "Contact";
        status = "Contact not found";
        mainContent = content;
        return { toolName, status, mainContent };
      }
    }

    return { toolName, status, mainContent };
  };

  const { toolName, status, mainContent } = parseContent();

  return (
    <div className="bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-md hover:shadow-lg transition p-5 w-full max-w-4xl self-center my-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ToolIcon toolName={toolName} />
          <div>
            <h3 className="font-bold text-white text-lg">{toolName}</h3>
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                status.includes("Error") || status.includes("failed")
                  ? "bg-red-500/20 text-red-400"
                  : "bg-green-500/20 text-green-400"
              }`}
            >
              {status}
            </span>
          </div>
        </div>
      </div>

      {/* Portfolio Snapshot (Aligned List) */}
      {toolName === "Portfolio Snapshot" && Array.isArray(mainContent) && (
        <PortfolioUI data={mainContent as PortfolioRow[]} />
      )}

      {/* Markdown/Text */}
      {mainContent && typeof mainContent === "string" && (
        <div className="mt-4 text-gray-200 leading-relaxed pl-10 prose prose-invert max-w-none">
          <ReactMarkdown>{mainContent}</ReactMarkdown>
        </div>
      )}

      {/* Charts */}
      {typeof mainContent === "object" && !Array.isArray(mainContent) && mainContent.labels && (mainContent.values || mainContent.series) && (
        <div className="mt-5 pl-10">
          <Chart
            title={mainContent.title || "Price Chart"}
            labels={mainContent.labels}
            values={mainContent.values}
            series={mainContent.series}
            type={mainContent.type || "line"}
          />
        </div>
      )}

      {/* Raw JSON/Text */}
      {showFullResult && (
        <div className="mt-5 bg-black/60 border border-gray-700 rounded-xl p-4 overflow-auto">
          <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">
            {typeof content === "string"
              ? content
              : JSON.stringify(content, null, 2)}
          </pre>
        </div>
      )}

      {/* Toggle Raw */}
      <div className="mt-5 flex justify-end">
        <button
          onClick={() => setShowFullResult(!showFullResult)}
          className="flex items-center gap-1 text-sm bg-gray-100 text-black font-medium px-4 py-2 rounded-lg hover:bg-gray-200 transition"
        >
          {showFullResult ? (
            <>
              <ChevronUp size={16} /> Hide Raw
            </>
          ) : (
            <>
              <ChevronDown size={16} /> View Raw
            </>
          )}
        </button>
      </div>
    </div>
  );
};
