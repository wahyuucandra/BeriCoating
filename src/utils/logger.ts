const LOG_PREFIX = '[CM8825]';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

class Logger {
  private enabled: boolean = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  packet(data: string, hex?: string, address?: string): void {
    if (!this.enabled) return;
    const timestamp = new Date().toISOString();
    const addr = address ? ` [${address}]` : '';
    const escaped = data.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
    const hexStr = hex || Array.from(data)
      .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(' ');
    console.log(`${LOG_PREFIX} PACKET${addr} [${timestamp}]: "${escaped}" | HEX: ${hexStr}`);
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.enabled) return;
    const timestamp = new Date().toISOString();
    const prefix = `${LOG_PREFIX} ${level} [${timestamp}]`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(prefix, message, ...args);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, ...args);
        break;
      default:
        console.log(prefix, message, ...args);
        break;
    }
  }
}

export const logger = new Logger();