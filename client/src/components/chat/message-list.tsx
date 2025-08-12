import { forwardRef, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AssistantType } from "@/components/chat/header";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
interface MessageListProps {
  messages: any[];
  isLoading: boolean;
  waitingForResponse?: boolean;
  assistantType: AssistantType;
}

const MessageList = forwardRef<HTMLDivElement, MessageListProps>(
  ({ messages, isLoading, waitingForResponse = false, assistantType }, ref) => {
    const getAssistantName = () => {
      switch (assistantType) {
        case "white-clinic":
          return "assistente White Clinic";
        case "spitz-pomer":
          return "assistente Spitz Pomer";
        case "loocal":
          return "assistente Loocal";
        case "scolados":
          return "assistente Scolados";
        case "olivas":
          return "assistente Olivas";
        case "beach-park":
          return "assistente Beach Park";
        default:
          return "assistente";
      }
    };

    const getAssistantInitials = () => {
      switch (assistantType) {
        case "white-clinic":
          return "WC";
        case "spitz-pomer":
          return "SP";
        case "loocal":
          return "LO";
        case "scolados":
          return "ES";
        case "olivas":
          return "OL";
        case "beach-park":
          return "BP";
        default:
          return "";
      }
    };

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
              <p className="text-gray-500 text-sm">Comece uma conversa com o {getAssistantName()}.</p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <MessageBubble 
              key={index} 
              message={message}
              assistantType={assistantType}
            />
          ))}

          {waitingForResponse && (
            <div className="flex justify-start mb-4">
              <div className="flex max-w-sm md:max-w-xl lg:max-w-2xl flex-row">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center bg-white border border-gray-200 text-indigo-500">
                    <span className="text-sm">{getAssistantInitials()}</span>
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

function FunctionCallMessage({ message }: { message: any }) {
  return (
    <Collapsible className="bg-orange-100 p-2 pl-4 rounded text-xs">
      <CollapsibleTrigger className="flex items-center justify-between w-full">
        <div className="flex items-center">
          <span className="font-semibold pr-2">Execução da Função:</span> {message.name}
        </div>
        <ChevronDown className="h-4 w-4 ml-4" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {message.arguments && (
          <div className="mt-1">
            <span className="font-semibold">Argumentos:</span>
            <pre className="mt-1 bg-orange-200 p-1 rounded overflow-x-auto whitespace-pre-wrap">
              {formatJSON(message.arguments)}
            </pre>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function FunctionOutputMessage({ message }: { message: any }) {
  return (
    <Collapsible className="bg-green-100 p-2 pl-4 rounded text-xs">
      <CollapsibleTrigger className="flex items-center justify-between w-full">
        <div className="flex items-center">
          <span className="font-semibold">Resultado da Função</span>
        </div>
        <ChevronDown className="h-4 w-4 ml-4" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {message.output && (
          <div className="mt-1">
            <pre className="mt-1 bg-green-200 p-1 rounded overflow-x-auto whitespace-pre-wrap">
              {formatJSON(message.output)}
            </pre>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function formatJSON(jsonString: string) {
  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return jsonString;
  }
}

function MessageBubble({ message, assistantType }: { message: any; assistantType: AssistantType }) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isFunctionCall = message.type === "function_call";
  const isFunctionOutput = message.type === "function_call_output";
  
  const getAssistantInitials = () => {
    switch (assistantType) {
      case "white-clinic":
        return "WC";
      case "spitz-pomer":
        return "SP";
      case "loocal":
        return "LO";
      case "scolados":
        return "ES";
      case "olivas":
        return "OL";
      case "beach-park":
        return "BP";
      default:
        return "";
    }
  };
  
  // Skip system messages and unsupported types
  if (message.role === "system" || (!isUser && !isAssistant && !isFunctionCall && !isFunctionOutput)) {
    return null;
  }
  
  // Skip function calls with no name
  if (isFunctionCall && !message.name) {
    return null;
  }
  
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`flex max-w-sm md:max-w-xl lg:max-w-4xl ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        <div className="flex-shrink-0">
          <div 
            className={`h-8 w-8 rounded-full flex items-center justify-center ${
              isUser 
                ? "bg-indigo-500 text-white" 
                : isFunctionCall
                  ? "bg-orange-500 text-white"
                  : isFunctionOutput
                    ? "bg-green-500 text-white"
                    : "bg-white border border-gray-200 text-indigo-500"
            }`}
          >
            <span className="text-sm">
              {isUser 
                ? "U" 
                : isFunctionCall 
                  ? "F" 
                  : isFunctionOutput 
                    ? "R" 
                    : getAssistantInitials()}
            </span>
          </div>
        </div>
        <div 
          className={`p-3 rounded-lg ${
            isUser 
              ? "bg-indigo-100 text-gray-800 mr-2" 
              : isFunctionCall
                ? "bg-orange-100 text-gray-800 ml-2"
                : isFunctionOutput
                  ? "bg-green-100 text-gray-800 ml-2"
                  : "bg-white text-gray-800 shadow-sm ml-2"
          }`}
        >
          {message.content && (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
          
          {isFunctionCall && (
            <FunctionCallMessage message={message} />
          )}
          
          {isFunctionOutput && (
            <FunctionOutputMessage message={message} />
          )}
          
          {message.function_call && !isFunctionCall && (
            <div className="mt-2 border-t border-gray-200 pt-2">
              <div className="text-xs font-medium text-gray-500">Function Call</div>
              <div className="bg-orange-100 p-2 rounded text-xs mt-1">
                <div><span className="font-semibold">Name:</span> {message.function_call.name}</div>
                {message.function_call.arguments && (
                  <div className="mt-1">
                    <span className="font-semibold">Arguments:</span>
                    <pre className="mt-1 bg-orange-200 p-1 rounded overflow-x-auto whitespace-pre-wrap">
                      {formatJSON(message.function_call.arguments)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
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
