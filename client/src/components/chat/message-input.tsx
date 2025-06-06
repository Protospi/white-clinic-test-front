import { useState, FormEvent, useRef, useEffect } from "react";
import { SendIcon, BugIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  debugMode?: boolean;
}

export default function MessageInput({ onSendMessage, isLoading, debugMode = false }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const previousLoadingState = useRef(isLoading);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage("");
      
      // Focus the input field immediately after sending the message
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  // Focus on the input field when the component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Focus on the input field when loading state changes from true to false
  useEffect(() => {
    // If previously loading and now not loading (assistant finished responding)
    if (previousLoadingState.current === true && isLoading === false) {
      // Focus the input after a short delay to ensure the UI has updated
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
    // Update the previous loading state
    previousLoadingState.current = isLoading;
  }, [isLoading]);

  return (
    <footer className="bg-white p-4">
      <form onSubmit={handleSubmit} className="flex space-x-3">
        <Input
          ref={inputRef}
          className={`flex-1 border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
            debugMode ? "border-red-300 focus:ring-red-500" : "border-gray-300 focus:ring-indigo-500"
          }`}
          placeholder={debugMode ? "Modo de depuração - digite /debug para sair..." : "Digite sua mensagem..."}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          autoComplete="off"
        />
        <Button 
          type="submit"
          className={`${
            debugMode 
              ? "bg-red-500 hover:bg-red-600" 
              : "bg-indigo-500 hover:bg-indigo-600"
          } text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
            debugMode ? "focus:ring-red-500" : "focus:ring-indigo-500"
          }`}
          disabled={isLoading || !message.trim()}
        >
          {debugMode ? <BugIcon className="h-5 w-5" /> : <SendIcon className="h-5 w-5" />}
        </Button>
      </form>
    </footer>
  );
}
