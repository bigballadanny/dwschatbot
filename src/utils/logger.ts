const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

// Set current log level based on environment
const currentLevel = import.meta.env.DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;

// Define colors for different log levels in development
const LOG_COLORS = {
  DEBUG: '#6b7280', // gray
  INFO: '#3b82f6',  // blue
  WARN: '#f59e0b',  // amber
  ERROR: '#ef4444'  // red
} as const;

/**
 * Structured logging utility with environment-aware log levels
 */
export const logger = {
  debug: (component: string, message: string, data?: any) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      if (import.meta.env.DEV) {
        console.log(
          `%c[${component}] ${message}`,
          `color: ${LOG_COLORS.DEBUG}`,
          data || ''
        );
      }
    }
  },

  info: (component: string, message: string, data?: any) => {
    if (currentLevel <= LOG_LEVELS.INFO) {
      if (import.meta.env.DEV) {
        console.info(
          `%c[${component}] ${message}`,
          `color: ${LOG_COLORS.INFO}`,
          data || ''
        );
      } else {
        console.info(`[${component}] ${message}`, data || '');
      }
    }
  },

  warn: (component: string, message: string, data?: any) => {
    if (currentLevel <= LOG_LEVELS.WARN) {
      if (import.meta.env.DEV) {
        console.warn(
          `%c[${component}] ${message}`,
          `color: ${LOG_COLORS.WARN}`,
          data || ''
        );
      } else {
        console.warn(`[${component}] ${message}`, data || '');
      }
    }
  },

  error: (component: string, message: string, error?: any) => {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      if (import.meta.env.DEV) {
        console.error(
          `%c[${component}] ${message}`,
          `color: ${LOG_COLORS.ERROR}`,
          error || ''
        );
      } else {
        console.error(`[${component}] ${message}`, error || '');
      }
    }
  },

  /**
   * Performance timing logger
   */
  time: (component: string, label: string) => {
    if (import.meta.env.DEV && currentLevel <= LOG_LEVELS.DEBUG) {
      console.time(`[${component}] ${label}`);
    }
  },

  timeEnd: (component: string, label: string) => {
    if (import.meta.env.DEV && currentLevel <= LOG_LEVELS.DEBUG) {
      console.timeEnd(`[${component}] ${label}`);
    }
  }
};

export default logger;