import { useState } from 'react';
import ChatUI from './components/ChatUI';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

function App() {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setResponse('');
    setLoading(true);

    const res = await fetch('http://localhost:8080/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Explain quantum physics like I am 5' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder('utf-8');

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      setResponse((prev) => prev + decoder.decode(value));
    }

    setLoading(false);
  };
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center p-6 gap-4 bg-background transition-colors duration-300">
      <ChatUI />
      <WalletMultiButton />
      <div className="p-4">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={generate}
          disabled={loading}
        >
          {loading ? 'Thinking...' : 'Ask'}
        </button>
        <pre className="mt-4 whitespace-pre-wrap">{response}</pre>
      </div>
    </div>
  );
}

export default App;
