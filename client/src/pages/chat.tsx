import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ChatHeader from "@/components/chat/header";
import MessageList from "@/components/chat/message-list";
import MessageInput from "@/components/chat/message-input";
import LogsDrawer from "@/components/chat/logs-drawer";

export default function ChatPage() {
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [hasCheckpoint, setHasCheckpoint] = useState(false);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
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
      const response = await apiRequest("POST", "/api/autobots/messages", { content });
      return response.json();
    },
    onSuccess: (data) => {
      // Replace all messages with the updated list from the API
      setMessages(data.messages || []);
      
      // Invalidate conversation query to keep sync with server
      queryClient.invalidateQueries({ queryKey: ["/api/conversation"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  });

  // Debug message mutation
  const debugMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/autobots/debug", { content });
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Debug response:", data);
      
      // Replace all messages with raw messages from the API
      setMessages(data.messages || []);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to debug message",
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
    
    // Toggle debug mode with a special command
    if (content.toLowerCase().trim() === "/debug") {
      setDebugMode(!debugMode);
      toast({
        title: debugMode ? "Debug Mode Disabled" : "Debug Mode Enabled",
        description: debugMode 
          ? "Normal mode activated. Messages will be sent to the regular endpoint."
          : "Debug mode activated. Messages will show raw response data."
      });
      return;
    }
    
    // Temporarily add user message to UI for responsiveness
    const temporaryUserMessage = {
      role: "user",
      content: content
    };
    
    setMessages(prev => [...prev, temporaryUserMessage]);
    setWaitingForResponse(true);
    
    // Send to appropriate backend endpoint based on debug mode
    if (debugMode) {
      debugMessageMutation.mutate(content, {
        onSuccess: () => {
          setWaitingForResponse(false);
        },
        onError: () => {
          setWaitingForResponse(false);
          // Remove temporary message on error
          setMessages(prev => prev.filter(m => m !== temporaryUserMessage));
        }
      });
    } else {
      sendMessageMutation.mutate(content, {
        onSuccess: () => {
          setWaitingForResponse(false);
        },
        onError: () => {
          setWaitingForResponse(false);
          // Remove temporary message on error
          setMessages(prev => prev.filter(m => m !== temporaryUserMessage));
        }
      });
    }
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
        hasCheckpoint={hasCheckpoint}
        debugMode={debugMode}
      />
      
      <MessageList 
        messages={messages} 
        isLoading={isLoading}
        waitingForResponse={waitingForResponse}
        ref={messageListRef}
      />
      
      <MessageInput 
        onSendMessage={handleSendMessage} 
        isLoading={
          sendMessageMutation.isPending || 
          debugMessageMutation.isPending || 
          waitingForResponse
        }
        debugMode={debugMode}
      />
      
      <LogsDrawer 
        isOpen={isLogsOpen} 
        onClose={handleToggleLogs} 
        messages={messages}
      />
    </div>
  );
}
