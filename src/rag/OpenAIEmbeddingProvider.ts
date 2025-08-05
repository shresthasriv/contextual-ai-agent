import { OpenAI } from 'openai';
import { EmbeddingProvider } from './types';
import { Logger } from '../utils/logger';

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    return this.client;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.getClient().embeddings.create({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000)
      });

      return response.data[0].embedding;
    } catch (error) {
      Logger.error('Failed to generate embedding', { error, textLength: text.length });
      return this.getMockEmbedding();
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const processedTexts = texts.map(text => text.substring(0, 8000));
      
      const response = await this.getClient().embeddings.create({
        model: 'text-embedding-3-small',
        input: processedTexts
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      Logger.error('Failed to generate embeddings', { error, count: texts.length });
      return texts.map(() => this.getMockEmbedding());
    }
  }

  private getMockEmbedding(): number[] {
    return Array.from({ length: 1536 }, () => Math.random() - 0.5);
  }
}
