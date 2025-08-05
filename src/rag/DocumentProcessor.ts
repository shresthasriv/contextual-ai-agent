import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { Document } from './types';
import { Logger } from '../utils/logger';

export class DocumentProcessor {
  private static readonly CHUNK_SIZE = 1000;
  private static readonly CHUNK_OVERLAP = 200;

  static async loadDocuments(docsPath: string): Promise<Document[]> {
    try {
      const files = await fs.readdir(docsPath);
      const markdownFiles = files.filter(file => file.endsWith('.md'));
      
      const documents = await Promise.all(
        markdownFiles.map(file => this.processMarkdownFile(path.join(docsPath, file)))
      );

      Logger.info('Documents loaded successfully', { 
        count: documents.length,
        totalChunks: documents.reduce((sum, doc) => sum + doc.chunks.length, 0)
      });

      return documents;
    } catch (error) {
      Logger.error('Failed to load documents', { error, docsPath });
      throw error;
    }
  }

  private static async processMarkdownFile(filePath: string): Promise<Document> {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);
    const stats = await fs.stat(filePath);

    const document: Document = {
      id: this.generateDocumentId(filePath),
      title: frontmatter.title || path.basename(filePath, '.md'),
      content,
      metadata: {
        source: filePath,
        wordCount: this.countWords(content),
        lastModified: stats.mtime
      },
      chunks: []
    };

    document.chunks = this.createChunks(document);
    return document;
  }

  private static createChunks(document: Document): import('./types').DocumentChunk[] {
    const sentences = this.splitIntoSentences(document.content);
    const chunks: import('./types').DocumentChunk[] = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const sentence of sentences) {
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
      
      if (potentialChunk.length > this.CHUNK_SIZE && currentChunk) {
        chunks.push(this.createChunk(currentChunk, document, chunkIndex));
        currentChunk = this.applyOverlap(currentChunk, sentence);
        chunkIndex++;
      } else {
        currentChunk = potentialChunk;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(this.createChunk(currentChunk, document, chunkIndex));
    }

    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  private static createChunk(
    content: string, 
    document: Document, 
    chunkIndex: number
  ): import('./types').DocumentChunk {
    return {
      id: `${document.id}-chunk-${chunkIndex}`,
      content: content.trim(),
      metadata: {
        source: document.metadata.source,
        title: document.title,
        chunkIndex,
        totalChunks: 0,
        wordCount: this.countWords(content)
      }
    };
  }

  private static splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0);
  }

  private static applyOverlap(currentChunk: string, nextSentence: string): string {
    const words = currentChunk.split(' ');
    const overlapWords = words.slice(-Math.floor(this.CHUNK_OVERLAP / 6));
    return overlapWords.join(' ') + ' ' + nextSentence;
  }

  private static countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private static generateDocumentId(filePath: string): string {
    return path.basename(filePath, '.md').toLowerCase().replace(/[^a-z0-9]/g, '-');
  }
}
