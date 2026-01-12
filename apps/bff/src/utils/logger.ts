import winston from "winston";

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    // Filter out stack traces for cleaner logs
    const { stack, ...rest } = metadata;
    if (Object.keys(rest).length > 0) {
      msg += ` ${JSON.stringify(rest)}`;
    }
    if (stack) {
      msg += `\n${stack}`;
    }
  }
  
  return msg;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json(),
  ),
  defaultMeta: { service: 'tidywaro-bff' },
  transports: [
    // Write errors to separate file
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs to combined file
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Console logging for development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'HH:mm:ss' }),
        consoleFormat,
      ),
    }),
  );
}

// Helper methods for structured logging
export const logRequest = (method: string, path: string, userId?: string) => {
  logger.info(`${method} ${path}`, { type: 'request', userId });
};

export const logResponse = (method: string, path: string, statusCode: number, duration: number) => {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  logger[level](`${method} ${path} ${statusCode}`, { type: 'response', statusCode, duration: `${duration}ms` });
};

export const logAuth = (action: string, userId?: string, success = true) => {
  const level = success ? 'info' : 'warn';
  logger[level](`Auth: ${action}`, { type: 'auth', userId, success });
};

export const logAI = (action: string, data?: Record<string, any>) => {
  logger.info(`AI: ${action}`, { type: 'ai', ...data });
};

export const logStorage = (action: string, path: string, success = true) => {
  const level = success ? 'debug' : 'warn';
  logger[level](`Storage: ${action}`, { type: 'storage', path, success });
};

export const logDatabase = (action: string, table: string, data?: Record<string, any>) => {
  logger.debug(`DB: ${action} on ${table}`, { type: 'database', table, ...data });
};

export default logger;
