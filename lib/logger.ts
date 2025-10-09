/**
 * Logging utility for development and production environments
 *
 * Usage:
 * - logger.debug(): Development only - for debugging info
 * - logger.info(): All environments - for informational messages
 * - logger.warn(): All environments - for warnings
 * - logger.error(): All environments - for errors (will send to Sentry in future)
 */

const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

// Disable all logs in test environment
const shouldLog = !isTest

export const logger = {
  /**
   * Debug logs - Only visible in development
   * Use for temporary debugging, component lifecycle, etc.
   */
  debug: (...args: any[]) => {
    if (isDev && shouldLog) {
      console.log('🔍', ...args)
    }
  },

  /**
   * Info logs - Visible in all environments
   * Use for important business logic events
   */
  info: (...args: any[]) => {
    if (shouldLog) {
      console.info('ℹ️', ...args)
    }
  },

  /**
   * Warning logs - Visible in all environments
   * Use for recoverable errors or deprecated features
   */
  warn: (...args: any[]) => {
    if (shouldLog) {
      console.warn('⚠️', ...args)
    }
  },

  /**
   * Error logs - Visible in all environments
   * Use for critical errors that should be tracked
   * TODO: Send to Sentry in production
   */
  error: (...args: any[]) => {
    if (shouldLog) {
      console.error('❌', ...args)
    }

    // TODO: Integrate with Sentry for production error tracking
    // if (!isDev && typeof window !== 'undefined') {
    //   Sentry.captureException(args[0])
    // }
  },

  /**
   * Performance measurement
   * Use for tracking slow operations
   */
  perf: (label: string, startTime: number) => {
    if (isDev && shouldLog) {
      const duration = performance.now() - startTime
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`)
    }
  }
}

// Export a type for the logger
export type Logger = typeof logger
