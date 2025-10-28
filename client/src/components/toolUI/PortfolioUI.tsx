import React from "react";

interface PortfolioRow {
  token: string;
  name: string;
  balance: string;
}

interface PortfolioUIProps {
  data: PortfolioRow[];
}

const PortfolioUI: React.FC<PortfolioUIProps> = ({ data }) => {
  return (
    <div className="mt-5 pl-10">
      <div className="grid grid-cols-3 text-sm font-semibold text-gray-400 mb-2">
        <div>Token</div>
        <div className="text-center">Name</div>
        <div className="text-right">Balance</div>
      </div>
      <div className="space-y-2">
        {data.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-3 bg-gray-800/40 p-2 rounded-lg text-gray-200"
          >
            <div>{row.token}</div>
            <div className="text-center">{row.name}</div>
            <div className="text-right">{row.balance}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioUI;
