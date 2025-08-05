export interface PluginContext {
  sessionId: string;
  userMessage: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface PluginResult {
  success: boolean;
  data?: any;
  error?: string;
  shouldRespond: boolean;
  response?: string;
}

export interface Plugin {
  name: string;
  description: string;
  canHandle(input: string): boolean;
  execute(context: PluginContext): Promise<PluginResult>;
}

export interface PluginRegistry {
  register(plugin: Plugin): void;
  getPlugin(input: string): Plugin | null;
  listPlugins(): Plugin[];
}
