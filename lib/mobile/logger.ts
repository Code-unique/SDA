// lib/mobile/logger.ts
import { NextRequest } from 'next/server'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  path: string
  method: string
  userId?: string
  ip?: string
  duration?: number
  metadata?: Record<string, any>
}

/**
 * Get client IP from request
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  return 'anonymous'
}

class MobileLogger {
  private static instance: MobileLogger
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'
  private isProduction = process.env.NODE_ENV === 'production'

  static getInstance(): MobileLogger {
    if (!MobileLogger.instance) {
      MobileLogger.instance = new MobileLogger()
    }
    return MobileLogger.instance
  }

  private formatLog(entry: LogEntry): string {
    const log = {
      ...entry,
      environment: process.env.NODE_ENV,
      pid: process.pid,
    }

    if (this.isProduction) {
      return JSON.stringify(log)
    }

    return [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`,
      `[${entry.path}]`,
      `[${entry.method}]`,
      entry.userId ? `[User: ${entry.userId}]` : '',
      entry.message,
      entry.duration ? `[${entry.duration}ms]` : '',
      entry.metadata ? JSON.stringify(entry.metadata) : '',
    ].filter(Boolean).join(' ')
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }

  private log(level: LogLevel, message: string, meta?: {
    request?: NextRequest
    userId?: string
    duration?: number
    metadata?: Record<string, any>
  }) {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      path: meta?.request?.nextUrl?.pathname || 'unknown',
      method: meta?.request?.method || 'unknown',
      userId: meta?.userId,
      ip: meta?.request ? getClientIp(meta.request) : undefined,
      duration: meta?.duration,
      metadata: meta?.metadata,
    }

    const formatted = this.formatLog(entry)

    switch (level) {
      case 'debug':
        console.debug(formatted)
        break
      case 'info':
        console.info(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
        console.error(formatted)
        break
    }
  }

  debug(message: string, meta?: any) {
    this.log('debug', message, meta)
  }

  info(message: string, meta?: any) {
    this.log('info', message, meta)
  }

  warn(message: string, meta?: any) {
    this.log('warn', message, meta)
  }

  error(message: string, meta?: any) {
    this.log('error', message, meta)
  }

  logRequest(request: NextRequest, userId?: string) {
    const start = Date.now()
    
    return {
      end: (statusCode: number, metadata?: Record<string, any>) => {
        const duration = Date.now() - start
        this.info(`Request completed`, {
          request,
          userId,
          duration,
          metadata: {
            statusCode,
            ...metadata,
          },
        })
      },
      error: (error: Error, metadata?: Record<string, any>) => {
        const duration = Date.now() - start
        this.error(error.message, {
          request,
          userId,
          duration,
          metadata: {
            stack: error.stack,
            ...metadata,
          },
        })
      },
    }
  }
}

export const logger = MobileLogger.getInstance()