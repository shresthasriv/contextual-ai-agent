import axios from 'axios';
import { Plugin, PluginContext, PluginResult } from '../types';
import { Logger } from '../../utils/logger';

export class WeatherPlugin implements Plugin {
  name = 'weather';
  description = 'Get current weather information for any city';

  private readonly API_BASE = 'http://api.weatherapi.com/v1';
  private readonly apiKey = process.env.WEATHER_API_KEY;

  canHandle(input: string): boolean {
    const weatherKeywords = /\b(weather|temperature|temp|forecast|climate|rain|snow|sunny|cloudy|wind)\b/i;
    const locationPattern = /\b(in|at|for)\s+([a-zA-Z\s,]+)(\?|$)/i;
    
    return weatherKeywords.test(input) || locationPattern.test(input);
  }

  async execute(context: PluginContext): Promise<PluginResult> {
    try {
      const location = this.extractLocation(context.userMessage);
      
      if (!location) {
        return {
          success: false,
          error: 'No location specified',
          contextInfo: 'User requested weather information but did not specify a location.'
        };
      }

      if (!this.apiKey) {
        return {
          success: false,
          error: 'Weather API not configured',
          contextInfo: 'Weather service is currently unavailable.'
        };
      }

      const weatherData = await this.fetchWeatherData(location);
      const contextInfo = `Weather data for ${location}:
${JSON.stringify(weatherData, null, 2)}`;

      Logger.info('Weather plugin executed successfully', {
        sessionId: context.sessionId,
        location
      });

      return {
        success: true,
        data: weatherData,
        pluginUsed: 'weather',
        contextInfo
      };
    } catch (error) {
      Logger.error('Weather plugin execution failed', {
        error,
        sessionId: context.sessionId
      });

      return {
        success: false,
        error: 'Weather fetch failed',
        contextInfo: 'Unable to retrieve weather information at the moment.'
      };
    }
  }

  private extractLocation(message: string): string | null {
    const patterns = [
      /weather.*?(?:in|at|for)\s+([a-zA-Z\s,]+)/i,
      /(?:in|at|for)\s+([a-zA-Z\s,]+?).*?weather/i,
      /weather\s+([a-zA-Z\s,]+)/i,
      /temperature.*?(?:in|at|for)\s+([a-zA-Z\s,]+)/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: just extract any city name after common words
    const fallback = message.match(/(?:weather|temperature).*?([A-Z][a-zA-Z\s]+)/i);
    if (fallback && fallback[1]) {
      return fallback[1].trim();
    }

    return null;
  }

  private async fetchWeatherData(location: string): Promise<any> {
    const response = await axios.get(`${this.API_BASE}/current.json`, {
      params: {
        key: this.apiKey,
        q: location,
        aqi: 'yes'
      },
      timeout: 5000
    });

    return response.data;
  }

  private formatWeatherResponse(data: any): string {
    const location = `${data.location.name}, ${data.location.region}, ${data.location.country}`;
    const temp = Math.round(data.current.temp_c);
    const feelsLike = Math.round(data.current.feelslike_c);
    const condition = data.current.condition.text;
    const humidity = data.current.humidity;
    const windSpeed = Math.round(data.current.wind_kph);
    const visibility = data.current.vis_km;
    const uvIndex = data.current.uv;

    let airQualityText = '';
    if (data.current.air_quality) {
      const aqiLevel = data.current.air_quality['us-epa-index'];
      const aqiLabels = ['Good', 'Moderate', 'Unhealthy for Sensitive', 'Unhealthy', 'Very Unhealthy', 'Hazardous'];
      airQualityText = `\n**Air Quality:** ${aqiLabels[aqiLevel - 1] || 'Unknown'} (${aqiLevel}/6)`;
    }

    return `🌤️ **Weather in ${location}**

**Temperature:** ${temp}°C (feels like ${feelsLike}°C)
**Conditions:** ${condition}
**Humidity:** ${humidity}%
**Wind Speed:** ${windSpeed} km/h
**Visibility:** ${visibility} km
**UV Index:** ${uvIndex}${airQualityText}

*Last updated: ${data.current.last_updated}*`;
  }

  private getAirQualityDescription(index: number): string {
    const descriptions = ['Good', 'Moderate', 'Unhealthy for Sensitive Groups', 'Unhealthy', 'Very Unhealthy', 'Hazardous'];
    return descriptions[index - 1] || 'Unknown';
  }
}
