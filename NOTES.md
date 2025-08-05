# Development Notes & Code Attribution

## What was AI-generated and what wasn't

### Created by me (Core Implementation)
- **Core Architecture**: `src/app.ts`, `package.json`, `tsconfig.json` - Express server setup, dependencies, TypeScript config
- **AI Agent System**: `src/agents/AIAgent.ts` - OpenAI integration, session management, orchestration
- **Memory System**: `src/memory/RedisMemoryStore.ts`, `src/memory/MemoryStoreFactory.ts` - Redis implementation and factory pattern
- **RAG System**: `src/rag/RAGService.ts` - Custom vector search, document chunking, embeddings
- **Plugin Architecture**: `src/plugins/` - Plugin interfaces, WeatherPlugin, MathPlugin, PluginManager

### AI-Assisted (Debugging & Utilities)
- **API Routes**: `src/routes/agent.ts` - Express routes with async handlers
- **Validation**: `src/utils/validation.ts` - Zod schemas and error handling
- **Error Handling**: `src/utils/errorHandler.ts` - Custom error classes and middleware
- **Logging**: `src/utils/logger.ts` - Winston structured logging

**Split**: ~70% user-created core, ~30% AI-assisted utilities/debugging

## Bugs faced and how they were solved

### 1. Redis Connection Pool Exhaustion
**Problem**: Redis connections not being properly closed, causing "too many connections" errors after multiple requests
**Solution**: Implemented proper connection pooling with `maxRetriesPerRequest: 3` and connection cleanup in Redis client

### 2. Vector Search Memory Leaks
**Problem**: RAG system loading all document embeddings into memory on each search, causing gradual memory increase
**Solution**: Implemented embedding caching and lazy loading - only load embeddings once and reuse across searches

### 4. Plugin Execution Timeouts
**Problem**: Weather API calls sometimes taking 10+ seconds, causing entire conversation to timeout
**Solution**: Added 5-second timeout to plugin execution with fallback error messages

### 5. Concurrent Session Race Conditions
**Problem**: Multiple rapid requests for same sessionId causing Redis write conflicts and conversation corruption
**Solution**: Implemented Redis transactions with WATCH/MULTI/EXEC to ensure atomic conversation updates

### 6. TypeScript Module Resolution
**Problem**: `Cannot find module './types'` errors when importing across different src/ subdirectories
**Solution**: Fixed tsconfig.json `baseUrl` and `paths` mapping to resolve imports correctly

### 7. Express JSON Body Size Limits
**Problem**: Large conversation histories causing "request entity too large" errors
**Solution**: Increased express.json() limit to 10mb and added conversation pruning to keep last 20 messages only

## How agent routes plugin calls + embeds memory + context

### Message Processing Flow (`src/agents/AIAgent.ts`)

1. **Session Retrieval**: `getConversation(sessionId)` loads chat history from Redis
2. **Memory Context**: Previous messages added to conversation context for continuity
3. **RAG Integration**: `ragService.searchDocuments(message)` finds relevant knowledge base content
4. **Context Building**: Combines system prompt + memory + RAG results + current message
5. **Plugin Detection**: AI decides if plugins needed based on message content
6. **Plugin Execution**: If detected, calls `pluginManager.executePlugin()` with parameters
7. **Response Generation**: OpenAI generates response with all context + plugin results
8. **Memory Storage**: `storeMessage()` saves both user message and AI response to Redis

### Plugin System Integration

```typescript
// In AIAgent.processMessage()
const ragResults = await this.ragService.searchDocuments(message, 3);
const conversation = await this.memoryStore.getConversation(sessionId);

// Build context with memory + RAG
const messages = [
  { role: "system", content: systemPrompt + ragContext },
  ...conversation,  // Previous messages from Redis
  { role: "user", content: message }
];

// AI response can trigger plugins automatically
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: messages,
  functions: pluginDefinitions  // Weather, math functions
});

// Handle plugin calls if AI requests them
if (response.function_call) {
  const result = await this.pluginManager.executePlugin(
    response.function_call.name,
    JSON.parse(response.function_call.arguments)
  );
  // Add plugin result to conversation and get final response
}
```

### Memory + Context Architecture

- **Redis Storage**: Each `sessionId` stores array of `{role, content, timestamp}` objects
- **Context Retrieval**: Every message loads full conversation history for context
- **RAG Enhancement**: Knowledge base search results added to system context
- **Plugin Results**: Plugin outputs integrated into conversation flow before final response
- **Persistent Sessions**: All context maintained across multiple requests via Redis