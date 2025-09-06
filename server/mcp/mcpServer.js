import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { z } from "zod";
import { Connection, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction, clusterApiUrl } from "@solana/web3.js";

// Create your Solana connection (devnet/mainnet as needed)
const connection = new Connection(clusterApiUrl(process.env.SOLANA_NETWORK ), "confirmed");

const server = new McpServer();

// 1. getBalance Tool
server.tool(
  "getBalance",
  {
    walletAddress: z.string().describe("Solana wallet address"),
  },
  async ({ walletAddress }) => {
    const pubkey = new PublicKey(walletAddress);
    const lamports = await connection.getBalance(pubkey);
    return {
      sol: lamports / 1_000_000_000,
    };
  }
);

// 2. send Tool
server.tool(
  "send",
  {
    from: z.string().describe("Sender's Solana wallet address"),
    to: z.string().describe("Recipient's Solana wallet address"),
    amount: z.number().describe("Amount in SOL"),
    // You may need to add a signature or use a backend wallet for signing
  },
  async ({ from, to, amount }) => {
    // WARNING: For production, handle signing securely!
    const fromPubkey = new PublicKey(from);
    const toPubkey = new PublicKey(to);

    // Example: Use a backend keypair for demo (not secure for real funds)
    // const sender = Keypair.fromSecretKey(...);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: amount * 1_000_000_000,
      })
    );

    // Sign and send the transaction (replace with secure signing in production)
    // const signature = await sendAndConfirmTransaction(connection, transaction, [sender]);

    // For demo, just return a placeholder
    return {
      message: `Transaction prepared to send ${amount} SOL from ${from} to ${to}.`,
      // txSignature: signature,
    };
  }
);

// 3. swap Tool (Pseudo-code, as swap logic depends on DEX integration)
server.tool(
  "swap",
  {
    walletAddress: z.string().describe("User's Solana wallet address"),
    fromToken: z.string().describe("Token to swap from (mint address)"),
    toToken: z.string().describe("Token to swap to (mint address)"),
    amount: z.number().describe("Amount to swap (in fromToken units)"),
  },
  async ({ walletAddress, fromToken, toToken, amount }) => {
    // Integrate with a DEX aggregator like Jupiter or Orca here
    // Prepare and return swap instructions or transaction
    return {
      message: `Swap request: ${amount} of ${fromToken} to ${toToken} for wallet ${walletAddress}.`,
      // txSignature: ...,
    };
  }
);

// Start the MCP server (stdio for local, or use HTTP/WebSocket as needed)
const transport = new StdioServerTransport();
server.connect(transport);
