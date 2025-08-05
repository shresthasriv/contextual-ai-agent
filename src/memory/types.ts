export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    plugins_used?: string[];
    sources?: string[];
    token_count?: number;
  };
}

export interface SessionMemory {
  session_id: string;
  messages: ChatMessage[];
  created_at: Date;
  last_active: Date;
  metadata?: {
    user_id?: string;
    conversation_summary?: string;
    message_count: number;
  };
}

export interface MemoryStore {
  getSession(sessionId: string): Promise<SessionMemory | null>;
  updateSession(sessionId: string, session: SessionMemory): Promise<void>;
  addMessage(sessionId: string, message: ChatMessage): Promise<void>;
  getRecentMessages(sessionId: string, limit?: number): Promise<ChatMessage[]>;
  deleteSession(sessionId: string): Promise<void>;
  listSessions(): Promise<string[]>;
  cleanup(maxAge?: number): Promise<number>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
