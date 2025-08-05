export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    title?: string;
    chunkIndex: number;
    totalChunks: number;
    wordCount: number;
  };
  embedding?: number[];
}

export interface Document {
  id: string;
  title: string;
  content: string;
  metadata: {
    source: string;
    wordCount: number;
    lastModified: Date;
  };
  chunks: DocumentChunk[];
}

export interface SearchResult {
  chunk: DocumentChunk;
  similarity: number;
}

export interface VectorStore {
  addDocument(document: Document): Promise<void>;
  search(query: string, topK?: number): Promise<SearchResult[]>;
  getDocumentCount(): number;
}

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}
