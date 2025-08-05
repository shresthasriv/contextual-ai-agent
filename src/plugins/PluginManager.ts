import { DefaultPluginRegistry } from './PluginRegistry';
import { WeatherPlugin } from './weather/WeatherPlugin';
import { MathPlugin } from './math/MathPlugin';
import { PluginContext, PluginResult, PluginRegistry } from './types';
import { Logger } from '../utils/logger';

export class PluginManager {
  private registry: PluginRegistry;

  constructor() {
    this.registry = new DefaultPluginRegistry();
    this.initializePlugins();
  }

  private initializePlugins(): void {
    this.registry.register(new WeatherPlugin());
    this.registry.register(new MathPlugin());
    
    Logger.info('Plugin manager initialized', {
      pluginCount: this.registry.listPlugins().length
    });
  }

  async processMessage(context: PluginContext): Promise<PluginResult | null> {
    const plugin = this.registry.getPlugin(context.userMessage);
    
    if (!plugin) {
      return null;
    }

    Logger.info('Plugin matched for processing', {
      plugin: plugin.name,
      sessionId: context.sessionId
    });

    return plugin.execute(context);
  }

  getAvailablePlugins(): Array<{ name: string; description: string }> {
    return this.registry.listPlugins().map(plugin => ({
      name: plugin.name,
      description: plugin.description
    }));
  }
}
