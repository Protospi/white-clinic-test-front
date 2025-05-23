import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, ChevronDown, ChevronRight, Download, UserCog } from "lucide-react";
import { useState } from "react";
import { MarkdownRenderer } from "@/lib/markdown-utils";
import { AssistantType } from "@/components/chat/header";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

interface LogsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: any[];
  assistantType: AssistantType;
}

export default function LogsDrawer({ isOpen, onClose, messages, assistantType }: LogsDrawerProps) {
  const { toast } = useToast();

  const getAssistantInitials = () => {
    return assistantType === "white-clinic" ? "WC" : "SP";
  };

  // Group messages by "conversation segments"
  // Each segment is a sequence of messages without clear breaks
  const messageGroups = messages.reduce<any[][]>((groups, message, index) => {
    if (index === 0) {
      // Start the first group
      return [[message]];
    }

    // Add to the last group
    const lastGroup = groups[groups.length - 1];
    lastGroup.push(message);
    
    return groups;
  }, []);

  // Check if a function call is an escalation call
  const isEscalationCall = (callName: string) => {
    return callName === "escalateToHuman" || callName === "escalateConversation" || callName.toLowerCase().includes("escalate");
  };

  const exportAsMarkdown = () => {
    try {
      let markdown = "# White Clinic Assistant Conversation\n\n";
    
      messages.forEach((message) => {
        // Handle user and assistant messages
        if (message.role === "user" || message.role === "assistant") {
          const speaker = message.role === "user" ? "**User**" : "**Assistant**";
          markdown += `${speaker}: ${message.content || ""}\n\n`;
          
          // Include function call if present in assistant message
          if (message.function_call) {
            markdown += "```\n";
            const callName = message.function_call.name || "N/A";
            const isEscalation = isEscalationCall(callName);
            
            markdown += isEscalation ? `🔔 ESCALATION: ${callName}\n` : `Function: ${callName}\n`;
            
            if (message.function_call.arguments) {
              markdown += `Arguments: ${formatJSON(message.function_call.arguments)}\n`;
            }
            
            if (message.function_call.result) {
              markdown += `Result: ${message.function_call.result}\n`;
            }
            
            if (isEscalation) {
              markdown += `Note: This conversation was escalated to a human representative.\n`;
            }
            
            markdown += "```\n\n";
          }
        }
        // Handle standalone function call messages
        else if (message.type === "function_call") {
          markdown += "**Function Call**:\n\n";
          markdown += "```\n";
          const callName = message.name || "N/A";
          const isEscalation = isEscalationCall(callName);
          
          markdown += isEscalation ? `🔔 ESCALATION: ${callName}\n` : `Function: ${callName}\n`;
          
          if (message.arguments) {
            markdown += `Arguments: ${formatJSON(message.arguments)}\n`;
          }
          
          if (isEscalation) {
            markdown += `Note: This conversation was escalated to a human representative.\n`;
          }
          
          markdown += "```\n\n";
        }
        // Handle standalone function output messages
        else if (message.type === "function_call_output") {
          markdown += "**Function Output**:\n\n";
          markdown += "```\n";
          
          if (message.output) {
            markdown += `Output: ${formatJSON(message.output)}\n`;
          }
          
          markdown += "```\n\n";
        }
      });
      
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      
      // Create temporary link and trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = "white-clinic-conversation.md";
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Conversation exported as markdown"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export conversation",
        variant: "destructive"
      });
    }
  };

  // Determine if message should be displayed
  const shouldDisplayMessage = (message: any) => {
    // Always display user and assistant messages
    if (message.role === "user" || message.role === "assistant") {
      return true;
    }
    
    // Display function call and function output messages
    if (message.type === "function_call" || message.type === "function_call_output") {
      return true;
    }
    
    return false;
  };

  // Get message content
  const getMessageContent = (message: any) => {
    if (message.content) {
      return message.content;
    }
    
    if (message.type === "function_call") {
      return `Function call: ${message.name}`;
    }
    
    if (message.type === "function_call_output") {
      return `Function output`;
    }
    
    return "No content";
  };

  return (
    <div 
      className={`fixed inset-y-0 right-0 w-full md:w-[900px] bg-white shadow-lg flex flex-col z-10 transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Conversation History</h2>
        <div className="flex gap-2">
          <Button 
            variant="default" 
            size="sm"
            onClick={exportAsMarkdown}
            className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-600"
          >
            <Download className="h-4 w-4" />
            Export as Markdown
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No conversation history yet.</p>
            </div>
          ) : (
            messageGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="border-b border-gray-200 pb-4">
                {group.map((message, messageIndex) => (
                  shouldDisplayMessage(message) && (
                    <div key={messageIndex} className="mb-4">
                      <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-1`}>
                        {/* For assistant messages */}
                        {message.role === "assistant" && (
                          <div className="flex items-start w-4/5">
                            <div className="flex-shrink-0 mr-2">
                              <div className="h-8 w-8 rounded-full flex items-center justify-center bg-white border border-gray-200 text-indigo-500">
                                <span className="text-sm">{getAssistantInitials()}</span>
                              </div>
                            </div>
                            <div className="flex-1 p-3 rounded-lg bg-white text-gray-800 shadow-sm">
                              {message.content && <MarkdownRenderer content={message.content} />}
                              
                              {/* Display embedded function call if present */}
                              {message.function_call && (
                                <Collapsible className="mt-2 border rounded-md bg-orange-50">
                                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium text-left text-orange-800 hover:bg-orange-100 rounded-t-md">
                                    <div className="flex items-center">
                                      <span className="mr-2 text-xs font-semibold uppercase text-orange-700">
                                        Function Call: {message.function_call.name || "Unknown"}
                                      </span>
                                    </div>
                                    <ChevronDown className="h-4 w-4 text-orange-600" />
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="p-3 text-sm border-t">
                                    <div className="space-y-2">
                                      <div>
                                        <span className="font-semibold text-gray-700">Function:</span>{" "}
                                        <span className="text-gray-600">{message.function_call.name}</span>
                                      </div>
                                      
                                      {message.function_call.arguments && (
                                        <div>
                                          <span className="font-semibold text-gray-700">Arguments:</span>
                                          <pre className="mt-1 p-2 bg-orange-100 rounded-md overflow-x-auto text-gray-600 text-xs">
                                            {formatJSON(message.function_call.arguments)}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* For user messages */}
                        {message.role === "user" && (
                          <div className="flex items-start w-4/5 flex-row-reverse">
                            <div className="flex-shrink-0 ml-2">
                              <div className="h-8 w-8 rounded-full flex items-center justify-center bg-indigo-500 text-white">
                                <span className="text-sm">U</span>
                              </div>
                            </div>
                            <div className="flex-1 p-3 rounded-lg bg-indigo-100 text-gray-800">
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            </div>
                          </div>
                        )}
                        
                        {/* For function call messages */}
                        {message.type === "function_call" && (
                          <div className="flex items-start w-4/5">
                            <div className="flex-shrink-0 mr-2">
                              <div className="h-8 w-8 rounded-full flex items-center justify-center bg-orange-500 text-white">
                                <span className="text-sm">F</span>
                              </div>
                            </div>
                            <div className="flex-1 p-3 rounded-lg bg-orange-50 text-gray-800 shadow-sm">
                              <div className="text-sm font-semibold text-orange-700 mb-1">Function Call: {message.name}</div>
                              {message.arguments && (
                                <div>
                                  <span className="text-xs font-medium text-gray-600">Arguments:</span>
                                  <pre className="mt-1 p-2 bg-orange-100 rounded-md overflow-x-auto text-gray-600 text-xs">
                                    {formatJSON(message.arguments)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* For function output messages */}
                        {message.type === "function_call_output" && (
                          <div className="flex items-start w-4/5">
                            <div className="flex-shrink-0 mr-2">
                              <div className="h-8 w-8 rounded-full flex items-center justify-center bg-green-500 text-white">
                                <span className="text-sm">R</span>
                              </div>
                            </div>
                            <div className="flex-1 p-3 rounded-lg bg-green-50 text-gray-800 shadow-sm">
                              <div className="text-sm font-semibold text-green-700 mb-1">Function Output</div>
                              {message.output && (
                                <div>
                                  <pre className="mt-1 p-2 bg-green-100 rounded-md overflow-x-auto text-gray-600 text-xs">
                                    {formatJSON(message.output)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                ))}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Helper function to format JSON strings
function formatJSON(jsonString: string) {
  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return jsonString;
  }
}
