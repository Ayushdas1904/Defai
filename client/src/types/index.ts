// src/types/index.ts

// For the 'send' tool
export type SendTxArgs = {
  toAddress: string;
  amount: number;
  tokenSymbol: string;
}
export type CreateAndSendContent = {
  action: 'createAndSendTransaction';
  args: SendTxArgs;
};

// For the 'swap' tool
export type SignAndSendContent = {
  action: 'signAndSendTransaction';
  base64Tx: string;
  orderId?: string; // Optional order ID for tracking
};

// A union type for all possible tool calls that require frontend action
export type ToolCallResult = CreateAndSendContent | SignAndSendContent;

// Chart data structure
export type ChartData = {
  title: string;
  type: 'line' | 'bar';
  labels: string[];
  values?: number[]; // Single series
  series?: Array<{
    name: string;
    data: number[];
    color?: string;
  }>; // Multiple series for comparison
};

// The shape of a single chat message in our state
export type Message = {
  role: "user" | "model";
  content: string | ChartData;
  isToolResponse?: boolean; // Optional flag for special UI
};

// The shape of the data chunks coming from the backend stream
export type StreamData =
  | { type: "text"; content: string; isToolResponse?: boolean; }
  | { type: "chart"; content: ChartData }
  | { type: "error"; content: string }
  | { type: "tool_code"; content: ToolCallResult };
