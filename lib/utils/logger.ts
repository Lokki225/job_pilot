type LogLevel = 'info' | 'warn' | 'error'

type LogMeta = Record<string, unknown>

function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return error
}

export function log(level: LogLevel, scope: string, message: string, meta?: LogMeta) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...(meta ? { meta } : {}),
  }

  if (level === 'error') {
    console.error(JSON.stringify(payload))
  } else if (level === 'warn') {
    console.warn(JSON.stringify(payload))
  } else {
    console.log(JSON.stringify(payload))
  }
}

export function logError(scope: string, message: string, error?: unknown, meta?: LogMeta) {
  log('error', scope, message, {
    ...(meta || {}),
    ...(error ? { error: serializeError(error) } : {}),
  })
}
