export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface Conversation {
  id: number;
  messages: Message[];
  hasCheckpoint: boolean;
  checkpoint: Message[];
}
