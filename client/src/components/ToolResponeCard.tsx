// src/components/ToolResponseCard.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import Chart from "./ui/chart";
import type { ChartData } from '../types';


// A simple map to get an icon for each tool
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
  return <span className="text-xl">{icons[toolName] || '⚙️'}</span>;
};

export const ToolResponseCard = ({ content }: { content: string | ChartData }) => {
  const [showFullResult, setShowFullResult] = React.useState(false);

  const parseContent = () => {
    let toolName = "Agent Response";
    let status = "Completed";
    let mainContent: string | ChartData = content;

    // Handle chart data directly
    if (typeof content === 'object' && content.labels && (content.values || content.series)) {
      toolName = content.series ? "Token Comparison" : "Price Chart";
      status = "Chart generated";
      return { toolName, status, mainContent };
    }

    // Only process string content for text parsing
    if (typeof content === 'string') {
      // 🔹 Balance
      const balanceMatch = content.match(/Your (.*) balance is (.*)/);
      if (balanceMatch) {
        toolName = "Check Balance";
        status = "Data retrieved successfully";
        mainContent = `**${balanceMatch[2]}**`;
        return { toolName, status, mainContent };
      }

      // 🔹 Token Price
      const priceMatch = content.match(/The current price of (.*) is \$(.*)\.?/);
      if (priceMatch) {
        toolName = "Token Price";
        status = "Data retrieved successfully";
        mainContent = `**$${priceMatch[2]}**`;
        return { toolName, status, mainContent };
      }
      
      // 🔹 Portfolio
      if (content.startsWith("Here's a snapshot")) {
        toolName = "Portfolio Snapshot";
        status = "Data retrieved successfully";
        mainContent = content.replace("Here's a snapshot of your portfolio:\n\n", "");
        return { toolName, status, mainContent };
      }
      
      // 🔹 Transaction History
      if (content.startsWith("Here are your most recent")) {
        toolName = "Transaction History";
        status = "Data retrieved successfully";
        mainContent = content.replace("Here are your most recent transactions:\n\n", "");
        return { toolName, status, mainContent };
      }
      
      // 🔹 Transaction Confirmation
      if (content.includes("Transaction Confirmed")) {
        toolName = "Transaction Status";
        status = "Transaction Confirmed";
        mainContent = "The transaction was successfully confirmed on the network.";
        return { toolName, status, mainContent };
      }

      // 🔹 Trigger Orders (Create / Cancel / Get / Execute)
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
      
      // 🔹 Errors
      if (content.startsWith("❌")) {
        toolName = "Error";
        status = "An error occurred";
        mainContent = content.replace("❌ ", "");
        return { toolName, status, mainContent };
      }

      if (content.includes("📈")) {
        toolName = "Token Price";
        status = "Chart generated";
        mainContent = content.replace("📈 ", "");
        return { toolName, status, mainContent };
      }

      // 🔹 Contact operations
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
    <div className="bg-[#1C1C1C] border border-gray-700 rounded-xl p-4 w-full max-w-4xl self-center my-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ToolIcon toolName={toolName} />
          <div>
            <h3 className="font-bold text-white">{toolName}</h3>
            <p className={`text-sm ${status.includes("Error") || status.includes("failed") ? "text-red-400" : "text-green-400"}`}>
              {status}
            </p>
          </div>
        </div>
      </div>
      
      {mainContent && typeof mainContent === "string" && (
  <div className="mt-4 text-white pl-10">
    <ReactMarkdown>{mainContent}</ReactMarkdown>
  </div>
)}

{/* 🔹 Chart Support */}
{typeof mainContent === "object" && mainContent.labels && (mainContent.values || mainContent.series) && (
  <div className="mt-4 pl-10">
    <Chart
      title={mainContent.title || "Price Chart"}
      labels={mainContent.labels}
      values={mainContent.values}
      series={mainContent.series}
      type={mainContent.type || "line"}
    />
  </div>
)}


      {showFullResult && (
        <div className="mt-4 bg-black p-3 rounded-lg">
          <pre className="text-xs text-gray-300 whitespace-pre-wrap">
            <code>{typeof content === 'string' ? content : JSON.stringify(content, null, 2)}</code>
          </pre>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-700 flex justify-end">
        <button 
          onClick={() => setShowFullResult(!showFullResult)}
          className="text-sm bg-white text-black font-semibold px-4 py-2 rounded-lg hover:bg-gray-200"
        >
          {showFullResult ? 'Hide Full Result' : 'View Full Result'}
        </button>
      </div>
    </div>
  );
};
