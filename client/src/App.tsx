import ChatUI from './components/ChatUI';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

function App() {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center p-6 gap-4 bg-background transition-colors duration-300">
      <div className="fixed top-4 right-4 z-50">
      <WalletMultiButton />
      </div>
      <ChatUI />
    </div>
  );
}

export default App;
