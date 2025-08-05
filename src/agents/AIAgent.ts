import { OpenAI } from 'openai';
import { ChatMessage, MemoryStore } from '../memory/types';
import { RAGService } from '../rag/RAGService';
import { PluginManager } from '../plugins/PluginManager';
import { Logger } from '../utils/logger';

export interface AgentConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt?: string;
}

export class AIAgent {
  private openai: OpenAI | null = null;
  private config: AgentConfig;
  private openaiInitialized = false;
  private pluginManager: PluginManager;

  constructor(
    private memoryStore: MemoryStore,
    private ragService: RAGService,
    config: Partial<AgentConfig> = {}
  ) {
    this.config = {
      model: 'gpt-4',
      maxTokens: 1500,
      temperature: 0.7,
      ...config
    };
    this.pluginManager = new PluginManager();
  }

  private getOpenAIClient(): OpenAI | null {
    if (!this.openaiInitialized) {
      this.initializeOpenAI();
      this.openaiInitialized = true;
    }
    return this.openai;
  }

  private initializeOpenAI(): void {
    try {
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        Logger.info('OpenAI client initialized successfully');
      } else {
        Logger.warn('OpenAI API key not found or invalid - using mock responses');
      }
    } catch (error) {
      Logger.error('Failed to initialize OpenAI client', { error });
    }
  }

  async processMessage(sessionId: string, userMessage: string): Promise<string> {
    const userChatMessage: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    await this.memoryStore.addMessage(sessionId, userChatMessage);

    const recentMessages = await this.memoryStore.getRecentMessages(sessionId, 10);
    const conversationHistory = recentMessages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }));

    const pluginResult = await this.pluginManager.processMessage({
      sessionId,
      userMessage,
      conversationHistory
    });

    const relevantContext = await this.ragService.getRelevantContext(userMessage);
    const openaiClient = this.getOpenAIClient();
    
    let response: string;
    
    if (openaiClient) {
      response = await this.generateOpenAIResponse(sessionId, conversationHistory, relevantContext, pluginResult, openaiClient);
    } else {
      response = 'I\'m experiencing technical difficulties. Please try again.';
    }

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: response,
      timestamp: new Date()
    };

    await this.memoryStore.addMessage(sessionId, assistantMessage);

    return response;
  }

  private async generateOpenAIResponse(
    sessionId: string, 
    conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    relevantContext: string,
    pluginResult: any,
    openaiClient: OpenAI
  ): Promise<string> {
    try {
      const systemPrompt = await this.buildSystemPrompt(sessionId, relevantContext, pluginResult);
      
      const completion = await openaiClient.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      });

      return completion.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response.';
    } catch (error) {
      Logger.error('OpenAI API error', { error, sessionId });
      return 'I\'m experiencing technical difficulties. Please try again.';
    }
  }

  private async buildSystemPrompt(sessionId: string, relevantContext: string, pluginResult?: any): Promise<string> {
    const session = await this.memoryStore.getSession(sessionId);
    const messageCount = session?.metadata?.message_count || 0;
    const availablePlugins = this.pluginManager.getAvailablePlugins();

    const recentMessages = await this.memoryStore.getRecentMessages(sessionId, 2);
    const memorySummary = recentMessages.length > 0 
      ? recentMessages.map((msg: ChatMessage) => `${msg.role}: ${msg.content}`).join('\n')
      : 'No previous conversation history.';

    let prompt = `You are a helpful AI assistant with access to plugins and a knowledge base about markup languages, blogging, and technical documentation.

Keep your responses conversational and helpful. You have access to the following capabilities:
${availablePlugins.map(plugin => `- ${plugin.name}: ${plugin.description}`).join('\n')}

Current session: ${sessionId}
Message count in this session: ${messageCount}

## Memory Summary (Last 2 messages):
${memorySummary}`;

    if (relevantContext) {
      prompt += `

## Relevant Knowledge Base Information:
${relevantContext}

Use this information to provide more accurate and detailed responses when relevant to the user's question.`;
    }

    if (pluginResult?.success && pluginResult.contextInfo) {
      prompt += `

## Plugin Output:
Plugin used: ${pluginResult.pluginUsed || 'unknown'}
${pluginResult.contextInfo}

Use this plugin data to enhance your response. Provide a natural, conversational response that incorporates the plugin results.`;
    } else if (pluginResult && !pluginResult.success) {
      prompt += `

## Plugin Information:
A plugin was triggered but encountered an issue: ${pluginResult.error || 'Unknown error'}
Additional context: ${pluginResult.contextInfo || 'No additional context'}

Acknowledge the issue and provide a helpful response based on what you can determine from the user's request.`;
    }

    if (this.config.systemPrompt) {
      prompt += `\n\n${this.config.systemPrompt}`;
    }

    return prompt;
  }  getAvailablePlugins(): Array<{ name: string; description: string }> {
    return this.pluginManager.getAvailablePlugins();
  }

  async getSessionInfo(sessionId: string) {
    const session = await this.memoryStore.getSession(sessionId);
    return {
      exists: !!session,
      messageCount: session?.metadata?.message_count || 0,
      createdAt: session?.created_at,
      lastActive: session?.last_active
    };
  }
}
