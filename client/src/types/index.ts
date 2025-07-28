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
};

// A union type for all possible tool calls that require frontend action
export type ToolCallResult = CreateAndSendContent | SignAndSendContent;

// The shape of a single chat message in our state
export type Message = {
  role: "user" | "model";
  content: string;
  isToolResponse?: boolean; // Optional flag for special UI
};

// The shape of the data chunks coming from the backend stream
export type StreamData =
  | { type: "text"; content: string; isToolResponse?: boolean; }
  | { type: "error"; content: string }
  | { type: "tool_code"; content: ToolCallResult };
