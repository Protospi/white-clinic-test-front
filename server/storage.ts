import { conversations, type Conversation, type InsertConversation, type Message } from "@shared/schema";
import { users, type User, type InsertUser } from "@shared/schema";

// Define storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Conversation methods
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, messages: Message[]): Promise<Conversation | undefined>;
  saveCheckpoint(id: number, messages: Message[]): Promise<Conversation | undefined>;
  clearConversation(id: number): Promise<Conversation | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private conversations: Map<number, Conversation>;
  private userCurrentId: number;
  private conversationCurrentId: number;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.userCurrentId = 1;
    this.conversationCurrentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Conversation methods
  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }
  
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const id = this.conversationCurrentId++;
    const newConversation: Conversation = { ...conversation, id };
    this.conversations.set(id, newConversation);
    return newConversation;
  }
  
  async updateConversation(id: number, messages: Message[]): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    conversation.messages = messages;
    this.conversations.set(id, conversation);
    return conversation;
  }
  
  async saveCheckpoint(id: number, messages: Message[]): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    conversation.checkpoint = [...messages];
    conversation.hasCheckpoint = true;
    this.conversations.set(id, conversation);
    return conversation;
  }
  
  async clearConversation(id: number): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    const systemMessage = conversation.messages.find(msg => msg.role === "system");
    const initialMessages = systemMessage ? [systemMessage] : [];
    
    conversation.messages = initialMessages;
    conversation.checkpoint = initialMessages;
    conversation.hasCheckpoint = false;
    
    this.conversations.set(id, conversation);
    return conversation;
  }
}

export const storage = new MemStorage();
