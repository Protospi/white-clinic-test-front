import { Button } from "@/components/ui/button";
import { PinIcon, History, Trash2, ClipboardList, FileText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HeaderProps {
  onCheckpoint: () => void;
  onClear: () => void;
  onShowLogs: () => void;
  onExport: () => void;
  onShowPrompt: () => void;
  hasCheckpoint: boolean;
}

export default function ChatHeader({ onCheckpoint, onClear, onShowLogs, onExport, onShowPrompt, hasCheckpoint }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm">
      <h1 className="text-lg font-semibold text-gray-800">White Clinic Assistant</h1>
      
      <div className="flex space-x-4">
        <TooltipProvider>
          {/* Checkpoint Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onCheckpoint}
                className={hasCheckpoint ? "text-green-500 hover:text-green-700" : "text-gray-500 hover:text-green-700"}
              >
                {hasCheckpoint ? (
                  <History className="h-8 w-8 text-green-500" />
                ) : (
                  <PinIcon className="h-8 w-8" color="black" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {hasCheckpoint ? "Restore to checkpoint" : "Save checkpoint"}
            </TooltipContent>
          </Tooltip>

          {/* Clear Chat Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClear}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-7 w-7" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Clear conversation
            </TooltipContent>
          </Tooltip>

          {/* Logs Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onShowLogs}
                className="text-gray-500 hover:text-indigo-500"
              >
                <ClipboardList className="h-8 w-8" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              View conversation history
            </TooltipContent>
          </Tooltip>

          {/* Prompt Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onShowPrompt}
                className="text-gray-500 hover:text-indigo-500"
              >
                <FileText className="h-8 w-8" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              View system prompt
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}
