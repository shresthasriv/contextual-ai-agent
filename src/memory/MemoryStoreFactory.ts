import { MemoryStore } from './types';
import { RedisMemoryStore } from './RedisMemoryStore';
import { Logger } from '../utils/logger';

export class MemoryStoreFactory {
  static async create(): Promise<MemoryStore> {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      throw new Error('Redis URL is required. Please set REDIS_URL environment variable.');
    }

    Logger.info('Connecting to Redis memory store...', { url: redisUrl });
    
    try {
      const redisStore = new RedisMemoryStore();
      await redisStore.connect();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (redisStore.isConnected()) {
        Logger.info('Successfully connected to Redis memory store');
        return redisStore;
      } else {
        throw new Error('Redis connection not established');
      }
    } catch (error) {
      Logger.error('Failed to connect to Redis', { 
        error: error instanceof Error ? error.message : error,
        url: redisUrl
      });
      throw new Error(`Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
