// Allow any message format from Autobots API
export type Message = any;

export interface FunctionCallData {
  type: string;
  name?: string;
  arguments?: string;
  result?: string;
  calls?: FunctionCall[];
}

export interface FunctionCall {
  name: string;
  arguments: string;
  result?: string;
}

export interface Conversation {
  id: number;
  messages: Message[];
  hasCheckpoint: boolean;
  checkpoint: Message[];
}
