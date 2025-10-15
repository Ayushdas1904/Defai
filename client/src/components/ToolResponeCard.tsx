// src/components/ToolResponseCard.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';

// A simple map to get an icon for each tool
const ToolIcon = ({ toolName }: { toolName: string }) => {
  const icons: { [key: string]: string } = {
    'Check Balance': '💰',
    'Portfolio Snapshot': '💼',
    'Token Price': '📈',
    'Transaction History': '📜',
    'Transaction Status': '✅',
    'Trigger Order': '🎯',
    'Error': '❌',
  };
  return <span className="text-xl">{icons[toolName] || '⚙️'}</span>;
};

export const ToolResponseCard = ({ content }: { content: string }) => {
  const [showFullResult, setShowFullResult] = React.useState(false);

  const parseContent = () => {
    let toolName = "Agent Response";
    let status = "Completed";
    let mainContent = content;

    // 🔹 Balance
    const balanceMatch = content.match(/Your (.*) balance is (.*)/);
    if (balanceMatch) {
      toolName = "Check Balance";
      status = "Data retrieved successfully";
      mainContent = `**${balanceMatch[2]}**`;
    }

    // 🔹 Token Price
    const priceMatch = content.match(/The current price of (.*) is \$(.*)\.?/);
    if (priceMatch) {
      toolName = "Token Price";
      status = "Data retrieved successfully";
      mainContent = `**$${priceMatch[2]}**`;
    }
    
    // 🔹 Portfolio
    if (content.startsWith("Here's a snapshot")) {
      toolName = "Portfolio Snapshot";
      status = "Data retrieved successfully";
      mainContent = content.replace("Here's a snapshot of your portfolio:\n\n", "");
    }
    
    // 🔹 Transaction History
    if (content.startsWith("Here are your most recent")) {
      toolName = "Transaction History";
      status = "Data retrieved successfully";
      mainContent = content.replace("Here are your most recent transactions:\n\n", "");
    }
    
    // 🔹 Transaction Confirmation
    if (content.includes("Transaction Confirmed")) {
      toolName = "Transaction Status";
      status = "Transaction Confirmed";
      mainContent = "The transaction was successfully confirmed on the network.";
    }

    // 🔹 Trigger Orders (Create / Cancel / Get / Execute)
    if (content.startsWith("✅ Trigger order created")) {
      toolName = "Trigger Order";
      status = "Order created successfully";
      mainContent = content.replace("✅ Trigger order created: ", "");
    }
    if (content.includes("🛑 Cancel request for Order ID")) {
      toolName = "Trigger Order";
      status = "Cancel request initiated";
      mainContent = content;
    }
    if (content.includes("✅ Order Cancelled")) {
      toolName = "Trigger Order";
      status = "Order cancelled successfully";
      mainContent = content;
    }
    if (content.startsWith("📋")) {
      toolName = "Trigger Order";
      status = "Active orders retrieved";
      mainContent = content.replace("📋 ", "");
    }
    
    // 🔹 Errors
    if (content.startsWith("❌")) {
      toolName = "Error";
      status = "An error occurred";
      mainContent = content.replace("❌ ", "");
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
      
      {mainContent && (
        <div className="mt-4 text-white pl-10">
          <ReactMarkdown>{mainContent}</ReactMarkdown>
        </div>
      )}

      {showFullResult && (
        <div className="mt-4 bg-black p-3 rounded-lg">
          <pre className="text-xs text-gray-300 whitespace-pre-wrap">
            <code>{content}</code>
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
