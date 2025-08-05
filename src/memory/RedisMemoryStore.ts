import { createClient, RedisClientType } from 'redis';
import { ChatMessage, SessionMemory, MemoryStore } from './types';
import { Logger } from '../utils/logger';

export class RedisMemoryStore implements MemoryStore {
  private client: RedisClientType;
  private readonly keyPrefix = 'agent:session:';
  private readonly sessionListKey = 'agent:sessions';
  private connected = false;

  constructor(url?: string) {
    this.client = createClient({
      url: url || process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.client.on('error', (err) => {
      Logger.error('Redis connection error', { error: err.message });
      this.connected = false;
    });

    this.client.on('connect', () => {
      Logger.info('Redis connected successfully');
      this.connected = true;
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      try {
        await this.client.connect();
        // Wait for connection to be established
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Redis connection timeout'));
          }, 2000);
          
          const checkConnection = () => {
            if (this.connected) {
              clearTimeout(timeout);
              resolve(void 0);
            } else {
              setTimeout(checkConnection, 50);
            }
          };
          checkConnection();
        });
        Logger.info('RedisMemoryStore connected successfully');
      } catch (error) {
        Logger.error('Failed to connect to Redis', { error });
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private getSessionKey(sessionId: string): string {
    return `${this.keyPrefix}${sessionId}`;
  }

  async getSession(sessionId: string): Promise<SessionMemory | null> {
    try {
      const data = await this.client.get(this.getSessionKey(sessionId));
      if (!data) return null;

      const parsed = JSON.parse(data);
      return {
        ...parsed,
        created_at: new Date(parsed.created_at),
        last_active: new Date(parsed.last_active),
        messages: parsed.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      };
    } catch (error) {
      Logger.error('Failed to get session', { sessionId, error });
      return null;
    }
  }

  async updateSession(sessionId: string, session: SessionMemory): Promise<void> {
    try {
      session.last_active = new Date();
      session.metadata = {
        ...session.metadata,
        message_count: session.messages.length
      };

      await Promise.all([
        this.client.setEx(
          this.getSessionKey(sessionId),
          86400,
          JSON.stringify(session)
        ),
        this.client.sAdd(this.sessionListKey, sessionId)
      ]);
    } catch (error) {
      Logger.error('Failed to update session', { sessionId, error });
      throw error;
    }
  }

  async addMessage(sessionId: string, message: ChatMessage): Promise<void> {
    let session = await this.getSession(sessionId);
    
    if (!session) {
      session = {
        session_id: sessionId,
        messages: [],
        created_at: new Date(),
        last_active: new Date(),
        metadata: { message_count: 0 }
      };
    }

    session.messages.push(message);
    await this.updateSession(sessionId, session);
  }

  async getRecentMessages(sessionId: string, limit = 10): Promise<ChatMessage[]> {
    const session = await this.getSession(sessionId);
    if (!session) return [];
    
    return session.messages.slice(-limit);
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await Promise.all([
        this.client.del(this.getSessionKey(sessionId)),
        this.client.sRem(this.sessionListKey, sessionId)
      ]);
    } catch (error) {
      Logger.error('Failed to delete session', { sessionId, error });
      throw error;
    }
  }

  async listSessions(): Promise<string[]> {
    try {
      return await this.client.sMembers(this.sessionListKey);
    } catch (error) {
      Logger.error('Failed to list sessions', { error });
      return [];
    }
  }

  async cleanup(maxAge = 86400000): Promise<number> {
    try {
      const sessionIds = await this.listSessions();
      const now = Date.now();
      let cleaned = 0;

      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId);
        if (session && (now - session.last_active.getTime()) > maxAge) {
          await this.deleteSession(sessionId);
          cleaned++;
        }
      }

      Logger.info('Session cleanup completed', { cleaned, total: sessionIds.length });
      return cleaned;
    } catch (error) {
      Logger.error('Failed to cleanup sessions', { error });
      return 0;
    }
  }
}
