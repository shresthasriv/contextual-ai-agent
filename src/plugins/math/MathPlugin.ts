import { Plugin, PluginContext, PluginResult } from '../types';
import { Logger } from '../../utils/logger';

export class MathPlugin implements Plugin {
  name = 'math';
  description = 'Perform mathematical calculations and solve expressions';

  canHandle(input: string): boolean {
    const mathKeywords = /\b(calculate|compute|solve|math|addition|subtract|multiply|divide|percentage|square|root|power)\b/i;
    const mathOperators = /[+\-*/^%=()]/;
    const mathExpression = /\b\d+\s*[+\-*/^%]\s*\d+/;
    
    return mathKeywords.test(input) || mathOperators.test(input) || mathExpression.test(input);
  }

  async execute(context: PluginContext): Promise<PluginResult> {
    try {
      const expression = this.extractExpression(context.userMessage);
      
      if (!expression) {
        return {
          success: false,
          shouldRespond: true,
          response: 'Please provide a mathematical expression to calculate.'
        };
      }

      const result = this.evaluateExpression(expression);
      const response = this.formatMathResponse(expression, result);

      Logger.info('Math plugin executed successfully', {
        sessionId: context.sessionId,
        expression,
        result
      });

      return {
        success: true,
        data: { expression, result },
        shouldRespond: true,
        response
      };
    } catch (error) {
      Logger.error('Math plugin execution failed', {
        error,
        sessionId: context.sessionId
      });

      return {
        success: false,
        shouldRespond: true,
        response: 'Sorry, I couldn\'t process that mathematical expression.'
      };
    }
  }

  private extractExpression(message: string): string | null {
    const patterns = [
      /(?:calculate|compute|solve)\s+(.+?)(?:\?|$|\.)/i,
      /what\s+is\s+(.+?)(?:\?|$|\.)/i,
      /(\d+(?:\.\d+)?\s*[+\-*/^%]\s*\d+(?:\.\d+)?(?:\s*[+\-*/^%]\s*\d+(?:\.\d+)?)*)/g
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    const numbers = message.match(/\d+(?:\.\d+)?/g);
    const operators = message.match(/[+\-*/^%]/g);
    
    if (numbers && operators && numbers.length >= 2 && operators.length >= 1) {
      return message.replace(/[^\d+\-*/^%().\s]/g, '').trim();
    }

    return null;
  }

  private evaluateExpression(expression: string): number {
    const sanitized = expression
      .replace(/[^0-9+\-*/^%().\s]/g, '')
      .replace(/\^/g, '**')
      .replace(/\s+/g, '');

    if (!this.isValidExpression(sanitized)) {
      throw new Error('Invalid mathematical expression');
    }

    try {
      return Function(`"use strict"; return (${sanitized})`)();
    } catch {
      throw new Error('Could not evaluate expression');
    }
  }

  private isValidExpression(expression: string): boolean {
    const allowedChars = /^[0-9+\-*/().%\s]+$/;
    const balancedParens = this.hasBalancedParentheses(expression);
    const noConsecutiveOps = !/[+\-*/]{2,}/.test(expression);
    
    return allowedChars.test(expression) && balancedParens && noConsecutiveOps;
  }

  private hasBalancedParentheses(expression: string): boolean {
    let count = 0;
    for (const char of expression) {
      if (char === '(') count++;
      if (char === ')') count--;
      if (count < 0) return false;
    }
    return count === 0;
  }

  private formatMathResponse(expression: string, result: number): string {
    const formattedResult = Number.isInteger(result) 
      ? result.toString() 
      : result.toFixed(6).replace(/\.?0+$/, '');

    return `🔢 **Mathematical Calculation**

**Expression:** ${expression}
**Result:** ${formattedResult}`;
  }
}
