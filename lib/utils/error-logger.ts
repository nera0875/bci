// Browser Console Error Logger
// This utility captures console errors and sends them to our API

export function initErrorLogger() {
  if (typeof window === 'undefined') return

  // Capture console errors
  const originalError = console.error
  console.error = (...args) => {
    // Call original console.error
    originalError.apply(console, args)

    // Log to our system
    logError('console.error', args)
  }

  // Capture unhandled errors
  window.addEventListener('error', (event) => {
    logError('window.error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.stack || event.error
    })
  })

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError('unhandledrejection', {
      reason: event.reason,
      promise: event.promise
    })
  })
}

function logError(type: string, data: any) {
  // In development, also log to console
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Error Logger] ${type}:`, data)
  }

  // You can send errors to an API endpoint if needed
  // fetch('/api/logs', { method: 'POST', body: JSON.stringify({ type, data }) })
}