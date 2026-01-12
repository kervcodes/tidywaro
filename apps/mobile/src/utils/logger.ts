/**
 * Centralized logging utility for the mobile app
 * Provides structured logging with different log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    data?: Record<string, any>;
}

// Store recent logs for debugging (last 100 entries)
const logHistory: LogEntry[] = [];
const MAX_LOG_HISTORY = 100;

const isDev = __DEV__;

const formatTimestamp = () => {
    return new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
};

const formatMessage = (level: LogLevel, message: string, data?: Record<string, any>): string => {
    const timestamp = formatTimestamp();
    let formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data && Object.keys(data).length > 0) {
        formatted += ` ${JSON.stringify(data)}`;
    }
    
    return formatted;
};

const addToHistory = (level: LogLevel, message: string, data?: Record<string, any>) => {
    const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        data,
    };
    
    logHistory.push(entry);
    
    // Keep only recent logs
    if (logHistory.length > MAX_LOG_HISTORY) {
        logHistory.shift();
    }
};

/**
 * Main logger object with level-specific methods
 */
export const logger = {
    debug: (message: string, data?: Record<string, any>) => {
        if (isDev) {
            console.log(formatMessage('debug', message, data));
        }
        addToHistory('debug', message, data);
    },
    
    info: (message: string, data?: Record<string, any>) => {
        if (isDev) {
            console.log(formatMessage('info', message, data));
        }
        addToHistory('info', message, data);
    },
    
    warn: (message: string, data?: Record<string, any>) => {
        console.warn(formatMessage('warn', message, data));
        addToHistory('warn', message, data);
    },
    
    error: (message: string, data?: Record<string, any>) => {
        console.error(formatMessage('error', message, data));
        addToHistory('error', message, data);
    },
    
    /**
     * Get recent log history (useful for debugging)
     */
    getHistory: (): LogEntry[] => [...logHistory],
    
    /**
     * Clear log history
     */
    clearHistory: () => {
        logHistory.length = 0;
    },
};

// Specialized loggers for different domains

/**
 * Log API-related events
 */
export const logApi = {
    request: (method: string, endpoint: string, data?: Record<string, any>) => {
        logger.info(`API Request: ${method} ${endpoint}`, data);
    },
    
    response: (method: string, endpoint: string, status: number, duration?: number) => {
        const level = status >= 400 ? 'error' : 'info';
        logger[level](`API Response: ${method} ${endpoint} ${status}`, { duration: duration ? `${duration}ms` : undefined });
    },
    
    error: (method: string, endpoint: string, error: string) => {
        logger.error(`API Error: ${method} ${endpoint}`, { error });
    },
};

/**
 * Log authentication events
 */
export const logAuth = {
    signIn: (success: boolean, error?: string) => {
        if (success) {
            logger.info('User signed in successfully');
        } else {
            logger.warn('Sign in failed', { error });
        }
    },
    
    signOut: () => {
        logger.info('User signed out');
    },
    
    sessionRestored: (hasSession: boolean) => {
        logger.info('Session check complete', { hasSession });
    },
    
    tokenRefresh: (success: boolean) => {
        logger.debug('Token refresh', { success });
    },
};

/**
 * Log navigation events
 */
export const logNavigation = {
    navigate: (screen: string, params?: Record<string, any>) => {
        logger.debug(`Navigate to: ${screen}`, params);
    },
    
    goBack: () => {
        logger.debug('Navigate back');
    },
};

/**
 * Log user interactions
 */
export const logInteraction = {
    buttonPress: (buttonName: string, screen?: string) => {
        logger.debug(`Button pressed: ${buttonName}`, { screen });
    },
    
    imageSelect: (source: 'camera' | 'gallery') => {
        logger.debug(`Image selected from ${source}`);
    },
    
    itemSelect: (itemId: string) => {
        logger.debug(`Item selected`, { itemId });
    },
};

export default logger;
