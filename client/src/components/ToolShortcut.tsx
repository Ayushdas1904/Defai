"use client";
import { useState } from "react";
import {
  RefreshCcw,
  ArrowUp,
  DollarSign,
  Shuffle,
  Briefcase,
  History,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "../components/ui/popover";

type Tool = {
  name: string;
  icon: React.ReactNode;
  examples: string[];
};

interface ToolShortcutProps {
  setInputValue: (value: string) => void;
}

const tools: Tool[] = [
  {
    name: "Swap",
    icon: <RefreshCcw className="w-4 h-4 text-purple-400" />,
    examples: [
      "Swap 1 SOL to USDC",
      "Swap 50 USDC to BONK",
      "Convert 0.5 SOL into USDT",
    ],
  },
  {
    name: "Send",
    icon: <ArrowUp className="w-4 h-4 text-green-400" />,
    examples: [
      "Send 0.001 SOL to Cogf5Bf75...",
      "Send 5 USDC to wallet X",
      "Transfer 10 BONK to friend",
    ],
  },
  {
    name: "Check Balance",
    icon: <DollarSign className="w-4 h-4 text-blue-400" />,
    examples: [
      "Check my SOL balance",
      "What is my USDC balance?",
      "Show portfolio balance in USDT",
    ],
  },
  {
    name: "Trigger",
    icon: <Shuffle className="w-4 h-4 text-purple-400" />,
    examples: [
      "Create a trigger order: 5 USDC → 5 USDT",
      "Set limit order to buy 1 SOL at $120",
      "Trigger swap 10 BONK if price > 0.001",
    ],
  },
  {
    name: "Portfolio",
    icon: <Briefcase className="w-4 h-4 text-blue-400" />,
    examples: [
      "Show my portfolio",
      "Breakdown holdings by token",
      "Portfolio value in USD",
    ],
  },
  {
    name: "Transaction History",
    icon: <History className="w-4 h-4 text-blue-400" />,
    examples: [
      "Show my recent transactions",
      "List last 5 swaps",
      "Transaction history for USDC",
    ],
  },
];

export default function ToolShortcut({ setInputValue }: ToolShortcutProps) {
  const [active, setActive] = useState<string | null>(null);

  const handleExampleClick = (example: string) => {
    setInputValue(example);
    setActive(null); // Close the popover
  };

  return (
    <div className="flex flex-wrap justify-between w-full">
      {tools.map((tool) => (
        <Popover
          key={tool.name}
          open={active === tool.name}
          onOpenChange={(open) => setActive(open ? tool.name : null)}
        >
          <PopoverTrigger asChild>
            <button
              className={`flex items-center space-x-2 text-sm font-medium px-3 py-1.5 rounded-xl transition-colors
                ${active === tool.name ? "bg-blue-900 text-white" : "text-gray-300 hover:text-white"
                }`}
            >
              {tool.icon}
              <span>{tool.name}</span>
            </button>
          </PopoverTrigger>

          <PopoverContent className="w-full p-2 bg-[#303030]">
            <ul className="space-y-1">
              {tool.examples.map((ex, i) => (
                <li
                  key={i}
                  className="text-sm px-2 py-1 rounded-md cursor-pointer hover:bg-[#3a3a3a] text-white"
                  onClick={() => handleExampleClick(ex)}
                >
                  {ex}
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  );
}
