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

    let response: string;

    if (pluginResult?.shouldRespond && pluginResult.response) {
      response = pluginResult.response;
    } else {
      const relevantContext = await this.ragService.getRelevantContext(userMessage);
      const openaiClient = this.getOpenAIClient();
      
      if (openaiClient) {
        response = await this.generateOpenAIResponse(sessionId, conversationHistory, relevantContext, openaiClient);
      } else {
        response = "client not initialized, unable to generate response.";
      }
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
    openaiClient: OpenAI
  ): Promise<string> {
    try {
      const systemPrompt = await this.buildSystemPrompt(sessionId, relevantContext);
      
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

  private async buildSystemPrompt(sessionId: string, relevantContext: string): Promise<string> {
    const session = await this.memoryStore.getSession(sessionId);
    const messageCount = session?.metadata?.message_count || 0;
    const availablePlugins = this.pluginManager.getAvailablePlugins();

    let prompt = `You are a helpful AI assistant with access to plugins and a knowledge base about markup languages, blogging, and technical documentation.

    Keep your responses conversational and helpful. You have access to the following capabilities:
    ${availablePlugins.map(plugin => `- ${plugin.name}: ${plugin.description}`).join('\n')}

    Current session: ${sessionId}
    Message count in this session: ${messageCount}`;

        if (relevantContext) {
            prompt += `

    ## Relevant Knowledge Base Information:
    ${relevantContext}

    Use this information to provide more accurate and detailed responses when relevant to the user's question.`;
    }

    if (this.config.systemPrompt) {
      prompt += `\n\n${this.config.systemPrompt}`;
    }

    return prompt;
  }

  getAvailablePlugins(): Array<{ name: string; description: string }> {
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
