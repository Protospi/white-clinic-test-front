import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { messageSchema } from "@shared/schema";
import OpenAI from "openai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Log environment variable status (for debugging)
console.log("OPENAI_API_KEY defined:", !!process.env.OPENAI_API_KEY);

// Initialize OpenAI client
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("ERROR: OPENAI_API_KEY is not defined in environment variables");
}

const openai = new OpenAI({ 
  apiKey: apiKey
});

// Define shared conversation ID (since we're using in-memory storage with a single conversation)
const CONVERSATION_ID = 1;

// Initialize default conversation with system prompt
async function initializeConversation() {
  const existingConversation = await storage.getConversation(CONVERSATION_ID);
  
  if (!existingConversation) {
    const systemMessage = {
      role: "system" as const,
      content: "You are the White Clinic Assistant, knowledgeable about our services. Be concise, friendly, and helpful."
    };
    
    await storage.createConversation({
      messages: [systemMessage],
      hasCheckpoint: false,
      checkpoint: [systemMessage]
    });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize conversation
  await initializeConversation();
  
  // Get current conversation
  app.get("/api/conversation", async (req: Request, res: Response) => {
    const conversation = await storage.getConversation(CONVERSATION_ID);
    
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    // Filter out system message for the UI
    const uiMessages = conversation.messages.filter(msg => msg.role !== "system");
    
    res.json({
      id: conversation.id,
      messages: uiMessages,
      hasCheckpoint: conversation.hasCheckpoint
    });
  });
  
  // Send message to OpenAI and get response
  app.post("/api/messages", async (req: Request, res: Response) => {
    try {
      // Create a local schema for validating incoming messages from client
      const messageInputSchema = z.object({
        content: z.string().min(1)
      });
      
      const validatedData = messageInputSchema.parse(req.body);
      const conversation = await storage.getConversation(CONVERSATION_ID);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Add user message to conversation
      const userMessage = {
        role: "user" as const,
        content: validatedData.content
      };
      
      const updatedMessages = [...conversation.messages, userMessage];
      
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Using gpt-4o which is a valid OpenAI model
        messages: updatedMessages
      });
      
      const assistantMessage = {
        role: "assistant" as const,
        content: response.choices[0].message.content || "I'm sorry, I couldn't generate a response."
      };
      
      // Save both messages to conversation
      const finalMessages = [...updatedMessages, assistantMessage];
      await storage.updateConversation(CONVERSATION_ID, finalMessages);
      
      res.status(200).json({
        userMessage,
        assistantMessage
      });
    } catch (error) {
      console.error("Error processing message:", error);
      
      // Provide more specific error messages for OpenAI API errors
      if (error instanceof Error) {
        // Check if it's an OpenAI error with additional properties
        const openAIError = error as any;
        if (openAIError.code === 'invalid_api_key') {
          return res.status(500).json({
            message: "OpenAI API key is invalid or not properly configured",
            error: openAIError.message
          });
        }
      }
      
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to process message" 
      });
    }
  });
  
  // Save checkpoint
  app.post("/api/checkpoint", async (req: Request, res: Response) => {
    try {
      const conversation = await storage.getConversation(CONVERSATION_ID);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      await storage.saveCheckpoint(CONVERSATION_ID, conversation.messages);
      
      res.status(200).json({ success: true, message: "Checkpoint saved" });
    } catch (error) {
      console.error("Error saving checkpoint:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to save checkpoint" 
      });
    }
  });
  
  // Restore to checkpoint
  app.post("/api/checkpoint/restore", async (req: Request, res: Response) => {
    try {
      const conversation = await storage.getConversation(CONVERSATION_ID);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      if (!conversation.hasCheckpoint) {
        return res.status(400).json({ message: "No checkpoint exists" });
      }
      
      await storage.updateConversation(CONVERSATION_ID, conversation.checkpoint);
      
      const uiMessages = conversation.checkpoint.filter(msg => msg.role !== "system");
      res.status(200).json({ 
        success: true, 
        message: "Checkpoint restored",
        messages: uiMessages
      });
    } catch (error) {
      console.error("Error restoring checkpoint:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to restore checkpoint" 
      });
    }
  });
  
  // Clear conversation
  app.post("/api/conversation/clear", async (req: Request, res: Response) => {
    try {
      await storage.clearConversation(CONVERSATION_ID);
      
      res.status(200).json({ success: true, message: "Conversation cleared" });
    } catch (error) {
      console.error("Error clearing conversation:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to clear conversation" 
      });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
