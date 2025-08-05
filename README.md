# AI Agent Server with RAG, Memory & Plugin System

A TypeScript backend server that combines AI conversation capabilities with Retrieval-Augmented Generation (RAG), persistent memory storage, and an extensible plugin architecture.

## Setup Steps

### Prerequisites
- Node.js 18+
- Redis server (local or remote)
- OpenAI API Key
- WeatherAPI Key (for weather plugin)

### Installation

1. Clone and install dependencies:
```bash
git clone https://github.com/shresthasriv/contextual-ai-agent.git
cd samarth
npm install
```

2. Create `.env` file:
```env
OPENAI_API_KEY=your_openai_api_key_here
REDIS_URL=redis://localhost:6379
WEATHER_API_KEY=your_weatherapi_key_here
PORT=3000
NODE_ENV=development
```

3. Start Redis server:
```bash
# Ubuntu/Debian
sudo systemctl start redis-server

# macOS with Homebrew
brew services start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

4. Run the server:
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

Server starts on `http://localhost:3000`

## Sample curl/Postman Commands

### Health Check
```bash
curl "http://localhost:3000/agent/health"
```

### AI Conversation
```bash
curl -X POST http://localhost:3000/agent/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is machine learning?",
    "sessionId": "user-123-session"
  }'
```

### Document Search (RAG)
```bash
curl "http://localhost:3000/agent/search?q=markdown&limit=3"
```

### Session Information
```bash
curl "http://localhost:3000/agent/session/user-123-session"
```

### Available Plugins
```bash
curl "http://localhost:3000/agent/plugins"
```

### Weather Plugin Example
```bash
curl -X POST http://localhost:3000/agent/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the weather like in New York?",
    "sessionId": "weather-test"
  }'
```

### Math Plugin Example
```bash
curl -X POST http://localhost:3000/agent/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Calculate 15 * 8 + sqrt(144)",
    "sessionId": "math-test"
  }'
```

## Agent Architecture and Flow

### System Components

```
src/
├── agents/           # AI Agent core logic
├── memory/           # Redis memory store implementation
├── rag/             # Retrieval-Augmented Generation system
├── plugins/         # Extensible plugin system
├── routes/          # Express API routes
├── utils/           # Validation, logging, error handling
└── types/           # TypeScript type definitions
```

### Message Processing Flow

1. **Request Received**: POST /agent/message with message and sessionId
2. **Session Retrieval**: Load conversation history from Redis
3. **RAG Integration**: Search knowledge base for relevant documents
4. **Context Building**: Combine system prompt + memory + RAG results + user message
5. **AI Processing**: Send to OpenAI GPT-4 with plugin function definitions
6. **Plugin Execution**: If AI requests plugin, execute weather/math functions
7. **Response Generation**: Generate final response with all context
8. **Memory Storage**: Save conversation to Redis for future context

### Key Components

- **AIAgent**: Orchestrates conversations, RAG, and plugin execution
- **RedisMemoryStore**: Persistent session and conversation storage
- **RAGService**: Document processing and vector similarity search
- **PluginManager**: Dynamic plugin loading and execution
- **ValidationSystem**: Request validation with proper error handling

### Plugin System Integration

```typescript
// Message processing in AIAgent.ts
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
}
```

### Memory + Context Architecture

- **Redis Storage**: Each sessionId stores array of {role, content, timestamp} objects
- **Context Retrieval**: Every message loads full conversation history for context
- **RAG Enhancement**: Knowledge base search results added to system context
- **Plugin Results**: Plugin outputs integrated into conversation flow before final response
- **Persistent Sessions**: All context maintained across multiple requests via Redis
