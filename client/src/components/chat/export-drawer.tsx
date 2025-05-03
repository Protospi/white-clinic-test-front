import { useState } from "react";
import { Message } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
}

export default function ExportDrawer({ isOpen, onClose, messages }: ExportDrawerProps) {
  const { toast } = useToast();
  const [exportFormat, setExportFormat] = useState<"markdown">("markdown");
  
  const generateMarkdown = () => {
    let markdown = "# White Clinic Assistant Conversation\n\n";
    
    messages.forEach((message) => {
      const speaker = message.role === "user" ? "**User**" : "**Assistant**";
      markdown += `${speaker}: ${message.content}\n\n`;
    });
    
    return markdown;
  };
  
  const handleExport = () => {
    try {
      const content = generateMarkdown();
      const blob = new Blob([content], { type: "text/markdown" });
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

  const previewContent = generateMarkdown();

  return (
    <div 
      className={`fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-lg flex flex-col z-10 transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Export Conversation</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
      </div>
      
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-medium mb-2">Export Format</h3>
        <div className="flex gap-2">
          <Button 
            variant={exportFormat === "markdown" ? "default" : "outline"}
            onClick={() => setExportFormat("markdown")}
            className="w-full"
          >
            Markdown (.md)
          </Button>
        </div>
      </div>
      
      <div className="p-4 border-b border-gray-200">
        <Button 
          onClick={handleExport}
          className="w-full flex items-center justify-center gap-2"
          disabled={messages.length === 0}
        >
          <Download className="h-4 w-4" />
          Export Conversation
        </Button>
      </div>
      
      <div className="p-4 flex-1 overflow-hidden">
        <h3 className="font-medium mb-2">Preview</h3>
        <ScrollArea className="h-full border rounded-md bg-gray-50 p-4">
          <pre className="whitespace-pre-wrap text-sm">{previewContent}</pre>
        </ScrollArea>
      </div>
    </div>
  );
}