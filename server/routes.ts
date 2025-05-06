import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const AUTOBOTS_API_URL = "http://localhost:3004/api/v1/agents/white-clinic/chat";

// Create memory object
const memory = {
  variables: {}
};

// Autobots API configuration
const AUTOBOTS_TOKEN = process.env.DEV_TOKEN || "";
if (!process.env.DEV_TOKEN) {
  console.warn("WARNING: DEV_TOKEN is not defined in environment variables for Autobots API");
}

// Define shared conversation ID (since we're using in-memory storage with a single conversation)
const CONVERSATION_ID = 1;

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Initialize or get conversation 
  app.get("/api/conversation", async (req: Request, res: Response) => {
    try {
      // Get or create conversation
      let conversation = await storage.getConversation(CONVERSATION_ID);
      
      if (!conversation) {
        // Initialize with empty conversation
        conversation = await storage.createConversation({
          messages: [],
          hasCheckpoint: false,
          checkpoint: []
        });
      }
      
      // Return all messages without filtering
      res.status(200).json({
        messages: conversation.messages,
        hasCheckpoint: conversation.hasCheckpoint
      });
    } catch (error) {
      console.error("Error getting conversation:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to get conversation" 
      });
    }
  });
  
  // Debug route to see raw Autobots API response
  app.post("/api/autobots/debug", async (req: Request, res: Response) => {
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

      // Get all existing messages (no filtering)
      const existingMessages = conversation.messages;
      
      // Add the new user message
      const userMessage = {
        role: "user",
        content: validatedData.content
      };
      
      const allMessages = [...existingMessages, userMessage];

      // Create request payload for Autobots API
      const autobotsPayload = {
        memory: {
          messages: allMessages,
          variables: memory.variables,
          contactData: {
            telefone: "558597496194" // Default test phone number
          }
        },
        identifier: "558597496194" // Default test identifier
      };

      console.log("Debug route - autobotsPayload", JSON.stringify(autobotsPayload, null, 2));

      // Call Autobots API
      const autobotsResponse = await fetch(AUTOBOTS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AUTOBOTS_TOKEN}`
        },
        body: JSON.stringify(autobotsPayload)
      });

      if (!autobotsResponse.ok) {
        const errorText = await autobotsResponse.text();
        throw new Error(`Autobots API error: ${autobotsResponse.status} - ${errorText}`);
      }
      const autobotsData = await autobotsResponse.json();

      // Log the entire autobotsData structure for debugging
      console.log("Debug route - autobotsData.memory:", JSON.stringify(autobotsData.memory, null, 2));
      console.log("Debug route - autobotsData.memory.messages:", JSON.stringify(autobotsData.memory.messages, null, 2));
      
      // Log all message types for analysis
      console.log("Debug route - Message types analysis:", 
        autobotsData.memory.messages.map((msg: any, index: number) => ({
          index,
          role: msg.role,
          type: msg.type,
          hasContent: !!msg.content,
          hasName: !!msg.name,
          hasArguments: !!msg.arguments,
          hasOutput: !!msg.output,
          hasFunctionCall: !!msg.function_call
        }))
      );

      // Return the raw messages to the client
      res.status(200).json({
        messages: autobotsData.memory.messages
      });
    } catch (error) {
      console.error("Error in debug route:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Debug route error" 
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
      
      res.status(200).json({ 
        success: true, 
        message: "Checkpoint restored",
        messages: conversation.checkpoint
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
  
  // Send message to Autobots API
  app.post("/api/autobots/messages", async (req: Request, res: Response) => {
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

      // Get all existing messages without filtering
      const existingMessages = conversation.messages;
      
      // Create user message
      const userMessage = {
        role: "user",
        content: validatedData.content
      };
      
      // Add it to existing messages
      const allMessages = [...existingMessages, userMessage];

      // Create request payload for Autobots API
      const autobotsPayload = {
        memory: {
          messages: allMessages,
          variables: memory.variables,
          contactData: {
            telefone: "558597496194" // Default test phone number
          }
        },
        identifier: "558597496194" // Default test identifier
      };

      console.log("autobotsPayload", JSON.stringify(autobotsPayload.memory.messages, null, 2));

      // Call Autobots API
      const autobotsResponse = await fetch(AUTOBOTS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AUTOBOTS_TOKEN}`
        },
        body: JSON.stringify(autobotsPayload)
      });

      if (!autobotsResponse.ok) {
        const errorText = await autobotsResponse.text();
        throw new Error(`Autobots API error: ${autobotsResponse.status} - ${errorText}`);
      }
      const autobotsData = await autobotsResponse.json();

      console.log("autobotsData", JSON.stringify(autobotsData.memory.messages, null, 2));
      
      // Store memory variables from response
      memory.variables = autobotsData.memory.variables;
      
      // Save all messages from Autobots API to our conversation storage
      await storage.updateConversation(CONVERSATION_ID, autobotsData.memory.messages);
      
      // Return the messages directly from Autobots
      res.status(200).json({
        messages: autobotsData.memory.messages
      });
    } catch (error) {
      console.error("Error processing message with Autobots API:", error);
      
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to process message with Autobots API" 
      });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
