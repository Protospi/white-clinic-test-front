import { Message } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface LogsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
}

export default function LogsDrawer({ isOpen, onClose, messages }: LogsDrawerProps) {
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

  return (
    <div 
      className={`fixed inset-y-0 right-0 w-full md:w-[900px] bg-white shadow-lg flex flex-col z-10 transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Conversation History</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
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
                    <div className="flex items-start mb-1">
                      <div className="flex-shrink-0 mr-2">
                        <div 
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            message.role === "user" 
                              ? "bg-indigo-500 text-white" 
                              : "bg-white border border-gray-200 text-indigo-500"
                          }`}
                        >
                          <span className="text-sm">{message.role === "user" ? "U" : "WC"}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>

                    {/* Function Call Data Display */}
                    {message.functionCallData && message.functionCallData.type !== "none" && (
                      <div className="ml-10 mt-2">
                        <Collapsible className="border rounded-md bg-gray-50">
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium text-left text-gray-700 hover:bg-gray-100 rounded-t-md">
                            <div className="flex items-center">
                              <span className="mr-2 text-xs font-semibold uppercase text-indigo-600">
                                Function Call
                              </span>
                            </div>
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="p-3 text-sm border-t">
                            <div className="space-y-2">
                              <div>
                                <span className="font-semibold text-gray-700">Type:</span>{" "}
                                <span className="text-gray-600">{message.functionCallData.type}</span>
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
