import path from 'path';
import { DocumentProcessor } from './DocumentProcessor';
import { OpenAIEmbeddingProvider } from './OpenAIEmbeddingProvider';
import { InMemoryVectorStore } from './InMemoryVectorStore';
import { VectorStore, SearchResult } from './types';
import { Logger } from '../utils/logger';

export class RAGService {
  private vectorStore: VectorStore;
  private initialized = false;

  constructor() {
    const embeddingProvider = new OpenAIEmbeddingProvider();
    this.vectorStore = new InMemoryVectorStore(embeddingProvider);
  }

  async initialize(docsPath?: string): Promise<void> {
    if (this.initialized) return;

    try {
      const documentsPath = docsPath || path.join(process.cwd(), 'docs');
      const documents = await DocumentProcessor.loadDocuments(documentsPath);

      await Promise.all(
        documents.map(doc => this.vectorStore.addDocument(doc))
      );

      this.initialized = true;
      
      Logger.info('RAG service initialized successfully', {
        documentCount: this.vectorStore.getDocumentCount(),
        docsPath: documentsPath
      });
    } catch (error) {
      Logger.error('Failed to initialize RAG service', { error, docsPath });
      throw error;
    }
  }

  async getRelevantContext(query: string, maxResults = 3): Promise<string> {
    if (!this.initialized) {
      Logger.warn('RAG service not initialized, returning empty context');
      return '';
    }

    try {
      const results = await this.vectorStore.search(query, maxResults);
      
      if (results.length === 0) {
        return '';
      }

      const context = results
        .filter(result => result.similarity > 0.1)
        .map((result, index) => 
          `[Context ${index + 1}] ${result.chunk.content}`
        )
        .join('\n\n');

      Logger.info('Retrieved relevant context', {
        query: query.substring(0, 100),
        contextLength: context.length,
        sources: results.map(r => r.chunk.metadata.title).filter(Boolean)
      });

      return context;
    } catch (error) {
      Logger.error('Failed to get relevant context', { error, query: query.substring(0, 100) });
      return '';
    }
  }

  async searchDocuments(query: string, topK = 5): Promise<SearchResult[]> {
    if (!this.initialized) {
      throw new Error('RAG service not initialized');
    }

    return this.vectorStore.search(query, topK);
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
