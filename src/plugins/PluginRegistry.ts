import { Plugin, PluginRegistry } from './types';
import { Logger } from '../utils/logger';

export class DefaultPluginRegistry implements PluginRegistry {
  private plugins = new Map<string, Plugin>();

  register(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin);
    Logger.info('Plugin registered', { name: plugin.name });
  }

  getPlugin(input: string): Plugin | null {
    for (const plugin of this.plugins.values()) {
      if (plugin.canHandle(input)) {
        return plugin;
      }
    }
    return null;
  }

  listPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
}
