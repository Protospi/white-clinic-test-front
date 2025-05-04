import { Message } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Copy } from "lucide-react";
import { useState, useEffect } from "react";
import { MarkdownRenderer } from "@/lib/markdown-utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface PromptDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
}

export default function PromptDrawer({ isOpen, onClose, messages }: PromptDrawerProps) {
  const { toast } = useToast();
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  
  // Fetch system prompt from API
  const { data: promptData, isLoading, error } = useQuery({
    queryKey: ["/api/system-prompt"],
    queryFn: async () => {
      const response = await fetch("/api/system-prompt");
      if (!response.ok) {
        throw new Error("Failed to load system prompt");
      }
      return response.json();
    },
    // Only fetch when the drawer is open
    enabled: isOpen
  });
  
  // Update system prompt when data changes
  useEffect(() => {
    if (promptData && promptData.systemPrompt) {
      setSystemPrompt(promptData.systemPrompt);
    }
  }, [promptData]);

  const copyToClipboard = () => {
    try {
      navigator.clipboard.writeText(systemPrompt);
      toast({
        title: "Success",
        description: "Prompt copied to clipboard"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy prompt",
        variant: "destructive"
      });
    }
  };

  return (
    <div 
      className={`fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-lg flex flex-col z-10 transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">System Prompt</h2>
        <div className="flex gap-2">
          <Button 
            variant="default" 
            size="sm"
            onClick={copyToClipboard}
            className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-600"
          >
            <Copy className="h-4 w-4" />
            Copy to Clipboard
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-gray-500">Loading system prompt...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-red-500">Error loading system prompt.</p>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
            {systemPrompt ? (
              <MarkdownRenderer content={systemPrompt} />
            ) : (
              <p className="text-gray-500">No system prompt found.</p>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
