export interface Logger {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export const consoleLogger: Logger = console;

export const silentLogger: Logger = { info() {}, warn() {}, error() {} };
