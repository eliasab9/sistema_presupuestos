/**
 * Structured server-side logger.
 * Emits JSON lines to stdout/stderr — readable by Vercel logs and any log aggregator.
 *
 * Usage:
 *   const log = createLogger('sheets/register');
 *   log.info('Budget registered', { budgetNumber: '945', rowNumber: 12 });
 *   log.error('Sheets API failed', { status: 403, body: '...' });
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  [key: string]: unknown;
}

function emit(
  level: LogLevel,
  context: string,
  message: string,
  extra?: Record<string, unknown>,
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    ...extra,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export interface Logger {
  info(message: string, extra?: Record<string, unknown>): void;
  warn(message: string, extra?: Record<string, unknown>): void;
  error(message: string, extra?: Record<string, unknown>): void;
}

export function createLogger(context: string): Logger {
  return {
    info:  (msg, extra) => emit('info',  context, msg, extra),
    warn:  (msg, extra) => emit('warn',  context, msg, extra),
    error: (msg, extra) => emit('error', context, msg, extra),
  };
}
