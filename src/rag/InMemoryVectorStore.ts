import { Document, DocumentChunk, SearchResult, VectorStore, EmbeddingProvider } from './types';
import { Logger } from '../utils/logger';

export class InMemoryVectorStore implements VectorStore {
  private chunks: DocumentChunk[] = [];
  private embeddings: Map<string, number[]> = new Map();

  constructor(private embeddingProvider: EmbeddingProvider) {}

  async addDocument(document: Document): Promise<void> {
    try {
      const chunkTexts = document.chunks.map(chunk => chunk.content);
      const embeddings = await this.embeddingProvider.generateEmbeddings(chunkTexts);

      document.chunks.forEach((chunk, index) => {
        chunk.embedding = embeddings[index];
        this.chunks.push(chunk);
        this.embeddings.set(chunk.id, embeddings[index]);
      });

      Logger.info('Document added to vector store', {
        documentId: document.id,
        chunkCount: document.chunks.length
      });
    } catch (error) {
      Logger.error('Failed to add document to vector store', { 
        error, 
        documentId: document.id 
      });
      throw error;
    }
  }

  async search(query: string, topK = 5): Promise<SearchResult[]> {
    try {
      const queryEmbedding = await this.embeddingProvider.generateEmbedding(query);
      
      const similarities = this.chunks.map(chunk => ({
        chunk,
        similarity: this.cosineSimilarity(
          queryEmbedding, 
          this.embeddings.get(chunk.id) || []
        )
      }));

      const results = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      Logger.info('Vector search completed', {
        query: query.substring(0, 100),
        resultsCount: results.length,
        topSimilarity: results[0]?.similarity || 0
      });

      return results;
    } catch (error) {
      Logger.error('Vector search failed', { error, query: query.substring(0, 100) });
      return [];
    }
  }

  getDocumentCount(): number {
    return new Set(this.chunks.map(chunk => chunk.metadata.source)).size;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }
}
