import { PromptBox } from "./ui/chatgpt-prompt-input";

const ChatUI = () => {
  return (
    <div className="w-full max-w-xl flex flex-col gap-10">
      <p className="text-center text-3xl text-foreground">
        How Can I Help You
      </p>
      <PromptBox />
    </div>
  )
};

export default ChatUI;
