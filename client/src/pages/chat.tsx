import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ChatHeader from "@/components/chat/header";
import MessageList from "@/components/chat/message-list";
import MessageInput from "@/components/chat/message-input";
import LogsDrawer from "@/components/chat/logs-drawer";
import PromptDrawer from "@/components/chat/prompt-drawer";
import { Message } from "@/lib/types";

export default function ChatPage() {
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasCheckpoint, setHasCheckpoint] = useState(false);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [useAutobotsApi, setUseAutobotsApi] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch conversation data
  const { data: conversationData, isLoading } = useQuery({
    queryKey: ["/api/conversation"],
    queryFn: async () => {
      const response = await fetch("/api/conversation");
      if (!response.ok) {
        throw new Error("Failed to load conversation");
      }
      return response.json();
    }
  });
  
  // Update messages when conversation data changes
  useEffect(() => {
    if (conversationData) {
      setMessages(conversationData.messages || []);
      setHasCheckpoint(conversationData.hasCheckpoint || false);
    }
  }, [conversationData]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      // Use the appropriate API endpoint based on the toggle state
      const endpoint = useAutobotsApi ? "/api/autobots/messages" : "/api/messages";
      const response = await apiRequest("POST", endpoint, { content });
      return response.json();
    },
    onSuccess: (data) => {
      // Replace all messages with the updated list from the API
      // to keep everything in sync
      queryClient.invalidateQueries({ queryKey: ["/api/conversation"] });
      
      // Add the assistant message immediately (user message is already displayed)
      setMessages((prevMessages) => {
        // Remove the last user message if it's a duplicate of what we just sent
        const filteredMessages = prevMessages.slice(0, -1);
        return [
          ...filteredMessages,
          data.userMessage,
          data.assistantMessage
        ];
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  });

  // Save checkpoint mutation
  const saveCheckpointMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/checkpoint", {});
      return response.json();
    },
    onSuccess: () => {
      setHasCheckpoint(true);
      toast({
        title: "Success",
        description: "Checkpoint saved"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/conversation"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save checkpoint",
        variant: "destructive"
      });
    }
  });

  // Restore checkpoint mutation
  const restoreCheckpointMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/checkpoint/restore", {});
      return response.json();
    },
    onSuccess: (data) => {
      setMessages(data.messages || []);
      toast({
        title: "Success",
        description: "Checkpoint restored"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/conversation"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore checkpoint",
        variant: "destructive"
      });
    }
  });

  // Clear conversation mutation
  const clearConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/conversation/clear", {});
      return response.json();
    },
    onSuccess: () => {
      setMessages([]);
      setHasCheckpoint(false);
      toast({
        title: "Success",
        description: "Conversation cleared"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/conversation"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear conversation",
        variant: "destructive"
      });
    }
  });

  // Handle sending a new message
  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;
    
    // Immediately add user message to the UI
    const userMessage: Message = { role: "user", content };
    setMessages(prev => [...prev, userMessage]);
    setWaitingForResponse(true);
    
    // Send to backend
    sendMessageMutation.mutate(content, {
      onSuccess: () => {
        setWaitingForResponse(false);
      },
      onError: () => {
        setWaitingForResponse(false);
      }
    });
  };

  // Handle checkpoint actions
  const handleCheckpoint = () => {
    // If we have a checkpoint, restore it
    if (hasCheckpoint) {
      restoreCheckpointMutation.mutate();
    } else {
      // Otherwise save a new checkpoint
      saveCheckpointMutation.mutate();
    }
  };

  // Handle clearing conversation
  const handleClear = () => {
    clearConversationMutation.mutate();
  };

  // Handle toggle logs drawer
  const handleToggleLogs = () => {
    setIsLogsOpen(!isLogsOpen);
  };
  
  // Handle toggle export drawer
  const handleToggleExport = () => {
    setIsExportOpen(!isExportOpen);
  };

  // Handle toggle prompt drawer
  const handleTogglePrompt = () => {
    setIsPromptOpen(!isPromptOpen);
  };

  // Handle API toggle
  const handleToggleApi = () => {
    setUseAutobotsApi(prev => !prev);
    toast({
      title: `API Changed`,
      description: `Now using ${!useAutobotsApi ? 'Autobots' : 'Default'} API`,
    });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ChatHeader 
        onCheckpoint={handleCheckpoint} 
        onClear={handleClear} 
        onShowLogs={handleToggleLogs}
        onExport={handleToggleExport}
        onShowPrompt={handleTogglePrompt}
        hasCheckpoint={hasCheckpoint}
        useAutobotsApi={useAutobotsApi}
        onToggleApi={handleToggleApi}
      />
      
      <MessageList 
        messages={messages} 
        isLoading={isLoading}
        waitingForResponse={waitingForResponse}
        ref={messageListRef}
      />
      
      <MessageInput 
        onSendMessage={handleSendMessage} 
        isLoading={sendMessageMutation.isPending || waitingForResponse}
      />
      
      <LogsDrawer 
        isOpen={isLogsOpen} 
        onClose={handleToggleLogs} 
        messages={messages}
      />
      <PromptDrawer
        isOpen={isPromptOpen}
        onClose={handleTogglePrompt}
        messages={messages}
      />
    </div>
  );
}
