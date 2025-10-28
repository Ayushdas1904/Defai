# 💠 DeFAI — Decentralized Finance AI Agent

**DeFAI** is a full-stack **DeFi (Decentralized Finance) AI Agent** platform built using the **MERN stack**, enabling users to interact with the blockchain through **natural language prompts**. The platform integrates **Solana**, **AI agents**, and **DeFi tools** to simplify crypto operations like trading, sending, swapping, setting token triggers and checking balances — all via chat.

---

## 🚀 Features

- 🧠 **AI-Powered DeFi Assistant** — Perform blockchain actions through simple prompts.
- 💳 **Wallet Integration** — Connect Solana wallets (like Phantom) seamlessly.
- 🔁 **DeFi Transactions** — Send, swap, and check balances on Solana mainnet.
- ⚡ **Real-Time Streaming Chat** — Chat UI built for streaming AI responses and tool-based outputs.
- 🔒 **Secure Transaction Flow** — Redirects to wallet for user approval and signature.
- 🧰 **Tool-Based Function Execution** — Modular backend tools for send, swap, trigger orders and getBalance.
- 🤖 **Gemini API Integration** — Used for AI prompt processing and tool orchestration.
- 🧑‍💻 **Developer-Friendly Structure** — Organized codebase with modular routes and clean architecture.

---

## 🏗️ Tech Stack

**Frontend:**  
- React + TypeScript (Vite)  
- Tailwind CSS  
- Lucide Icons  
- shadcn/ui Components  

**Backend:**  
- Node.js + Express (ESM)  
- MongoDB (Mongoose)  
- Gemini API (Production)

**Blockchain:**  
- Solana Web3.js
- Phantom Wallet Adapter  
- Mainnet or devnet Environment  

---

## 📂 Folder Structure

```
DeFAI/
│
├── client/                 # React + Vite Frontend
│   ├── src/
│   │   ├── components/     # UI Components
│   │   ├── pages/          # Page Layouts
│   │   ├── hooks/          # Custom Hooks
│   │   ├── store/          # Zustand Store
│   │   └── utils/          # Helper Functions
|   ├── .env
│
├── server/                 # Express Backend
│   ├── routes/             # API Routes (e.g., /chat)
│   ├── tools/              # AI Tools (send, swap, getBalance)
│   ├── index.js/           # MongoDB Schemas
│   └── config/             # Env + DB Setup
|   ├── .env/
│
└── README.md

```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the repository
```bash
git clone https://github.com/Ayushdas1904/Defai.git
cd Defai
````

### 2️⃣ Install dependencies

**Frontend:**

```bash
cd client
npm install
```

**Backend:**

```bash
cd ../server
npm install
```

### 3️⃣ Create environment files

Create a `.env` file inside the `/client` directory and add:

<!--```
PORT=8080
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
IS_LOCAL=true
SOLANA_NETWORK="mainnet-beta"
HELIUS_API_KEY=your_helius_api_key

```-->

Create a `.env` file inside the `/server` directory and add:

<!--```
VITE_BACKEND_URL=http://localhost:8080
VITE_SOLANA_NETWORK="mainnet-beta"
VITE_HELIUS_API_KEY=your_helius_api_key
```-->

### 4️⃣ Run the project

**Backend:**

```bash
npm run dev
```

**Frontend:**

```bash
npm run dev
```

Visit → `http://localhost:5173`

---

## 💬 Example Prompts

* “Check my wallet balance.”
* “Send 0.5 SOL to this address: …”
* “Swap 2 SOL to USDC.”
* “Show me my portfolio summary.”

---

## 🧩 Tools Implemented

| Tool Name      | Description                                |
| -------------- | ------------------------------------------ |
| **getBalance** | Fetches the connected wallet’s SOL balance |
| **send**       | Sends crypto to another Solana address     |
| **swap**       | Swaps(buy/sell) tokens using DeFi protocols          |
| **portfolio**  | Displays wallet token holdings             |
| **transaction**  | Get transaaction history                 |
| **getTokenComparison**  | Compare two tokens using price graph            |
| **getTokenPrice**  | Fetch token current price     |
| **triggerOrder**  | set, cancel and view your trigger orders  |


## ⭐ Contribute

Contributions are welcome!
Feel free to fork this repo, open issues, or submit pull requests.

---

## 🪙 License

This project is licensed under the **MIT License**.

---

**DeFAI** — Bridging AI and Blockchain through smart, conversational DeFi.

---

Would you like me to include badges (for Tech Stack, License, or Deployment) and generate a professional header banner for GitHub too?
```
