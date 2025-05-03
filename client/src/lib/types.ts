export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
  functionCallData?: FunctionCallData;
}

export interface FunctionCallData {
  type: string;
  name?: string;
  arguments?: string;
  result?: string;
}

export interface Conversation {
  id: number;
  messages: Message[];
  hasCheckpoint: boolean;
  checkpoint: Message[];
}
