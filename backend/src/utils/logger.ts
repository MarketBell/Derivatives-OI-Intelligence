export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG'
}

export class Logger {
  private static formatMessage(level: LogLevel, context: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | Meta: ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] [${context}] ${message}${metaStr}`;
  }

  public static info(context: string, message: string, meta?: any): void {
    console.log(this.formatMessage(LogLevel.INFO, context, message, meta));
  }

  public static warn(context: string, message: string, meta?: any): void {
    console.warn(this.formatMessage(LogLevel.WARN, context, message, meta));
  }

  public static error(context: string, message: string, meta?: any): void {
    console.error(this.formatMessage(LogLevel.ERROR, context, message, meta));
  }

  public static debug(context: string, message: string, meta?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage(LogLevel.DEBUG, context, message, meta));
    }
  }
}
