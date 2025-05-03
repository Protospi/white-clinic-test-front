import { Message } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";

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
                  <div key={messageIndex} className="flex items-start mb-2">
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
                ))}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
