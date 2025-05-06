import { Button } from "@/components/ui/button";
import { PinIcon, History, Trash2, ClipboardList, Bug } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HeaderProps {
  onCheckpoint: () => void;
  onClear: () => void;
  onShowLogs: () => void;
  hasCheckpoint: boolean;
  debugMode?: boolean;
}

export default function ChatHeader({ 
  onCheckpoint, 
  onClear, 
  onShowLogs, 
  hasCheckpoint,
  debugMode = false
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm">
      <div className="flex items-center space-x-4">
        <h1 className="text-lg font-semibold text-gray-800">
          White Clinic Assistant
          {debugMode && <span className="ml-2 text-sm font-normal text-red-500">[Debug Mode]</span>}
        </h1>
      </div>
      
      <div className="flex space-x-4">
        <TooltipProvider>
          {/* Debug Mode Indicator */}
          {debugMode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-red-500 hover:text-red-700"
                >
                  <Bug className="h-7 w-7" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Debug Mode Active - Type /debug to toggle
              </TooltipContent>
            </Tooltip>
          )}

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
        </TooltipProvider>
      </div>
    </header>
  );
}
