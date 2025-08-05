export class Logger {
  private static log(level: string, message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(meta && { meta })
    };
    
    console.log(JSON.stringify(logEntry));
  }

  static info(message: string, meta?: any): void {
    this.log('INFO', message, meta);
  }

  static error(message: string, meta?: any): void {
    this.log('ERROR', message, meta);
  }

  static warn(message: string, meta?: any): void {
    this.log('WARN', message, meta);
  }

  static debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('DEBUG', message, meta);
    }
  }
}
