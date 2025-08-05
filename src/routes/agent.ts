import express, { Request, Response } from 'express';
import { validateAgentRequest, validateSearchRequest } from '../utils/validation';
import { AgentResponse } from '../types';
import { Logger } from '../utils/logger';
import { AIAgent } from '../agents/AIAgent';
import { MemoryStoreFactory } from '../memory/MemoryStoreFactory';
import { RAGService } from '../rag/RAGService';
import { asyncHandler } from '../utils/errorHandler';

const router = express.Router();

let aiAgent: AIAgent;

const initializeAgent = async () => {
  const memoryStore = await MemoryStoreFactory.create();
  const ragService = new RAGService();
  
  await ragService.initialize();
  
  aiAgent = new AIAgent(memoryStore, ragService);
};

initializeAgent().catch(error => {
  Logger.error('Failed to initialize agent', { error });
  process.exit(1);
});

router.post('/message', asyncHandler(async (req: Request, res: Response) => {
  Logger.info('Received agent message request', { sessionId: req.body.sessionId });

  const { message, sessionId } = validateAgentRequest(req.body);

  const reply = await aiAgent.processMessage(sessionId, message);

  Logger.info('Successfully generated AI response', { 
    sessionId: sessionId,
    responseLength: reply.length 
  });

  const response: AgentResponse = {
    reply,
    session_id: sessionId,
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Session info endpoint
router.get('/session/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const sessionInfo = await aiAgent.getSessionInfo(sessionId);
  
  res.json({
    session_id: sessionId,
    ...sessionInfo,
    timestamp: new Date().toISOString()
  });
}));

// Document search endpoint
router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const { q, limit } = validateSearchRequest(req.query);

  const ragService = new RAGService();
  if (!ragService.isInitialized()) {
    await ragService.initialize();
  }

  const results = await ragService.searchDocuments(q, limit);

  res.json({
    query: q,
    results: results.map(result => ({
      content: result.chunk.content,
      similarity: result.similarity,
      source: result.chunk.metadata.title || result.chunk.metadata.source,
      chunkIndex: result.chunk.metadata.chunkIndex
    })),
    timestamp: new Date().toISOString()
  });
}));

// Available plugins endpoint
router.get('/plugins', asyncHandler(async (req: Request, res: Response) => {
  const plugins = aiAgent.getAvailablePlugins();
  
  res.json({
    plugins,
    count: plugins.length,
    timestamp: new Date().toISOString()
  });
}));

export default router;
