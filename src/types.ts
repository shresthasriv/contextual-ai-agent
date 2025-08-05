export interface AgentRequest {
  message: string;
  sessionId: string;
}

export interface AgentResponse {
  reply: string;
  session_id: string;
  plugins_used?: string[];
  sources_used?: string[];
  timestamp: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
}
