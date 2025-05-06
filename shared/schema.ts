import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the function call data schema
export const functionCallSchema = z.object({
  type: z.string(),
  name: z.string().optional(),
  arguments: z.string().optional(),
  result: z.string().optional(),
  calls: z.array(
    z.object({
      name: z.string(),
      arguments: z.string(),
      result: z.string().optional()
    })
  ).optional()
});

export type FunctionCallData = z.infer<typeof functionCallSchema>;

// Define message as any shape to accommodate all Autobots API message formats
export const messageSchema = z.any();

export type Message = any; // Allow any message format from Autobots API

// Define the conversation schema
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  messages: jsonb("messages").$type<Message[]>().notNull(),
  hasCheckpoint: boolean("has_checkpoint").notNull().default(false),
  checkpoint: jsonb("checkpoint").$type<Message[]>().notNull().default([]),
});

export const insertConversationSchema = createInsertSchema(conversations)
  .omit({ id: true });

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Define schema for users if needed later
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
