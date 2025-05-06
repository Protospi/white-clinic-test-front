import { forwardRef, useEffect, useState } from "react";
import { Message, FunctionCallData, FunctionCall } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  waitingForResponse?: boolean;
}

const MessageList = forwardRef<HTMLDivElement, MessageListProps>(
  ({ messages, isLoading, waitingForResponse = false }, ref) => {
    if (isLoading) {
      return (
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-full py-2 space-y-4 overflow-y-auto" ref={ref}>
            <MessageSkeleton />
            <MessageSkeleton isUser={false} />
            <MessageSkeleton />
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 p-4 overflow-hidden">
        <div 
          className="message-list h-full py-2 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent" 
          ref={ref}
        >
          {messages.length === 0 && !waitingForResponse && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 text-sm">Start a conversation with the White Clinic Assistant.</p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <MessageBubble 
              key={index} 
              message={message} 
            />
          ))}

          {waitingForResponse && (
            <div className="flex justify-start mb-4">
              <div className="flex max-w-sm md:max-w-xl lg:max-w-2xl flex-row">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center bg-white border border-gray-200 text-indigo-500">
                    <span className="text-sm">WC</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white text-gray-800 shadow-sm ml-2">
                  <TypingAnimation />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

function TypingAnimation() {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 400);
    
    return () => clearInterval(interval);
  }, []);
  
  return <span className="animate-pulse">{dots || ' '}</span>;
}

function FunctionCallDisplay({ functionCallData }: { functionCallData: FunctionCallData }) {
  return (
    <div className="mt-2 border-t border-gray-200 pt-2">
      <div className="text-xs font-medium text-gray-500">Function Call</div>
      {functionCallData.calls && functionCallData.calls.length > 0 ? (
        functionCallData.calls.map((call: FunctionCall, index: number) => (
          <div key={index} className="mt-1">
            <div className="bg-gray-100 p-2 rounded text-xs">
              <div><span className="font-semibold">Name:</span> {call.name}</div>
              {call.arguments && (
                <div className="mt-1">
                  <span className="font-semibold">Arguments:</span>
                  <pre className="mt-1 bg-gray-200 p-1 rounded overflow-x-auto whitespace-pre-wrap">
                    {formatJSON(call.arguments)}
                  </pre>
                </div>
              )}
              {call.result && (
                <div className="mt-1">
                  <span className="font-semibold">Result:</span>
                  <pre className="mt-1 bg-gray-200 p-1 rounded overflow-x-auto whitespace-pre-wrap">
                    {typeof call.result === 'string' ? call.result : JSON.stringify(call.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="mt-1">
          <div className="bg-gray-100 p-2 rounded text-xs">
            <div><span className="font-semibold">Name:</span> {functionCallData.name}</div>
            {functionCallData.arguments && (
              <div className="mt-1">
                <span className="font-semibold">Arguments:</span>
                <pre className="mt-1 bg-gray-200 p-1 rounded overflow-x-auto whitespace-pre-wrap">
                  {formatJSON(functionCallData.arguments)}
                </pre>
              </div>
            )}
            {functionCallData.result && (
              <div className="mt-1">
                <span className="font-semibold">Result:</span>
                <pre className="mt-1 bg-gray-200 p-1 rounded overflow-x-auto whitespace-pre-wrap">
                  {typeof functionCallData.result === 'string' ? functionCallData.result : JSON.stringify(functionCallData.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatJSON(jsonString: string) {
  try {
    return JSON.stringify(JSON.parse(jsonString), null, 2);
  } catch (e) {
    return jsonString;
  }
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`flex max-w-sm md:max-w-xl lg:max-w-4xl ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        <div className="flex-shrink-0">
          <div 
            className={`h-8 w-8 rounded-full flex items-center justify-center ${
              isUser 
                ? "bg-indigo-500 text-white" 
                : "bg-white border border-gray-200 text-indigo-500"
            }`}
          >
            <span className="text-sm">{isUser ? "U" : "WC"}</span>
          </div>
        </div>
        <div 
          className={`p-3 rounded-lg ${
            isUser 
              ? "bg-indigo-100 text-gray-800 mr-2" 
              : "bg-white text-gray-800 shadow-sm ml-2"
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          
          {message.functionCallData && message.functionCallData.type === "function_call" && (
            <FunctionCallDisplay functionCallData={message.functionCallData} />
          )}
        </div>
      </div>
    </div>
  );
}

function MessageSkeleton({ isUser = true }: { isUser?: boolean }) {
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`flex max-w-sm md:max-w-xl lg:max-w-2xl ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        <div className="flex-shrink-0">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className={isUser ? "mr-2" : "ml-2"}>
          <Skeleton className="h-24 w-80 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

MessageList.displayName = "MessageList";
export default MessageList;
