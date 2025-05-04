import { Message } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, ChevronDown, ChevronRight, Download } from "lucide-react";
import { useState } from "react";
import { MarkdownRenderer } from "@/lib/markdown-utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

interface LogsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
}

export default function LogsDrawer({ isOpen, onClose, messages }: LogsDrawerProps) {
  const { toast } = useToast();

  // Group messages by "conversation segments"
  // Each segment is a sequence of messages without clear breaks
  const messageGroups = messages.reduce<Message[][]>((groups, message, index) => {
    if (index === 0) {
      // Start the first group
      return [[message]];
    }

    // Add to the last group
    const lastGroup = groups[groups.length - 1];
    lastGroup.push(message);
    
    return groups;
  }, []);

  const exportAsMarkdown = () => {
    try {
      let markdown = "# White Clinic Assistant Conversation\n\n";
    
      messages.forEach((message) => {
        const speaker = message.role === "user" ? "**User**" : "**Assistant**";
        markdown += `${speaker}: ${message.content}\n\n`;
        
        // Include function call data if present
        if (message.functionCallData && message.functionCallData.type !== "none") {
          markdown += "```\n";
          
          if (message.functionCallData.calls && message.functionCallData.calls.length > 0) {
            // Include all function calls
            message.functionCallData.calls.forEach((call, index) => {
              markdown += `Function ${index + 1}: ${call.name || "N/A"}\n`;
              markdown += `Type: ${message.functionCallData?.type}\n`;
              
              if (call.arguments) {
                markdown += `Arguments: ${call.arguments}\n`;
              }
              
              if (call.result) {
                markdown += `Result: ${call.result}\n`;
              }
              
              if (message.functionCallData?.calls && index < message.functionCallData.calls.length - 1) {
                markdown += `\n`;
              }
            });
          } else {
            // For backward compatibility
            markdown += `Function: ${message.functionCallData.name || "N/A"}\n`;
            markdown += `Type: ${message.functionCallData.type}\n`;
            
            if (message.functionCallData.arguments) {
              markdown += `Arguments: ${message.functionCallData.arguments}\n`;
            }
            
            if (message.functionCallData.result) {
              markdown += `Result: ${message.functionCallData.result}\n`;
            }
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
                  <div key={messageIndex} className="mb-4">
                    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-1`}>
                      {/* For assistant messages */}
                      {message.role !== "user" && (
                        <div className="flex items-start w-4/5">
                          <div className="flex-shrink-0 mr-2">
                            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-white border border-gray-200 text-indigo-500">
                              <span className="text-sm">WC</span>
                            </div>
                          </div>
                          <div className="flex-1 p-3 rounded-lg bg-white text-gray-800 shadow-sm">
                            <MarkdownRenderer content={message.content} />
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
                    </div>

                    {/* Function Call Data Display */}
                    {message.functionCallData && message.functionCallData.type !== "none" && (
                      <div className={`mt-2 ${message.role === "user" ? "mr-10 flex justify-end" : "ml-10"}`}>
                        <div className="w-full md:w-4/5 space-y-2">
                          {/* Display multiple function calls if available */}
                          {message.functionCallData.calls && message.functionCallData.calls.length > 0 ? (
                            message.functionCallData.calls.map((call, callIndex) => (
                              <Collapsible key={callIndex} className="border rounded-md bg-gray-50">
                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium text-left text-gray-700 hover:bg-gray-100 rounded-t-md">
                                  <div className="flex items-center">
                                    <span className="mr-2 text-xs font-semibold uppercase text-indigo-600">
                                      Action {callIndex + 1}: {call.name || "Unknown"}
                                    </span>
                                  </div>
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="p-3 text-sm border-t">
                                  <div className="space-y-2">
                                    <div>
                                      <span className="font-semibold text-gray-700">Type:</span>{" "}
                                      <span className="text-gray-600">{message.functionCallData?.type}</span>
                                    </div>
                                    
                                    <div>
                                      <span className="font-semibold text-gray-700">Function:</span>{" "}
                                      <span className="text-gray-600">{call.name}</span>
                                    </div>
                                    
                                    {call.arguments && (
                                      <div>
                                        <span className="font-semibold text-gray-700">Arguments:</span>
                                        <pre className="mt-1 p-2 bg-gray-100 rounded-md overflow-x-auto text-gray-600 text-xs">
                                          {JSON.stringify(JSON.parse(call.arguments), null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                    
                                    {call.result && (
                                      <div>
                                        <span className="font-semibold text-gray-700">Result:</span>
                                        <div className="mt-1 p-2 bg-gray-100 rounded-md text-gray-600">
                                          {call.result}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            ))
                          ) : (
                            // Fallback for backward compatibility
                            <Collapsible className="border rounded-md bg-gray-50">
                              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium text-left text-gray-700 hover:bg-gray-100 rounded-t-md">
                                <div className="flex items-center">
                                  <span className="mr-2 text-xs font-semibold uppercase text-indigo-600">
                                    Action: {message.functionCallData.name || "Unknown"}
                                  </span>
                                </div>
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              </CollapsibleTrigger>
                              <CollapsibleContent className="p-3 text-sm border-t">
                                <div className="space-y-2">
                                  <div>
                                    <span className="font-semibold text-gray-700">Type:</span>{" "}
                                    <span className="text-gray-600">{message.functionCallData?.type}</span>
                                  </div>
                                  
                                  {message.functionCallData.name && (
                                    <div>
                                      <span className="font-semibold text-gray-700">Function:</span>{" "}
                                      <span className="text-gray-600">{message.functionCallData.name}</span>
                                    </div>
                                  )}
                                  
                                  {message.functionCallData.arguments && (
                                    <div>
                                      <span className="font-semibold text-gray-700">Arguments:</span>
                                      <pre className="mt-1 p-2 bg-gray-100 rounded-md overflow-x-auto text-gray-600 text-xs">
                                        {JSON.stringify(JSON.parse(message.functionCallData.arguments), null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  
                                  {message.functionCallData.result && (
                                    <div>
                                      <span className="font-semibold text-gray-700">Result:</span>
                                      <div className="mt-1 p-2 bg-gray-100 rounded-md text-gray-600">
                                        {message.functionCallData.result}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
