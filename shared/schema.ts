import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the message schema
export const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string()
});

export type Message = z.infer<typeof messageSchema>;

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
