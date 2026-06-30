// lib/mongodb.ts - ENHANCED
import mongoose from 'mongoose'
import { logger } from '@/lib/mobile/logger'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable')
}

// Global cache for connection
let cached: {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
  retries: number
} = (global as any).mongoose || { conn: null, promise: null, retries: 0 }

if (!(global as any).mongoose) {
  (global as any).mongoose = cached
}

const MAX_RETRIES = 3
const RETRY_DELAY = 5000 // 5 seconds

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    // Check if connection is still alive
    if (cached.conn.connection.readyState === 1) {
      return cached.conn
    }
    // Connection lost, reset
    cached.conn = null
    cached.promise = null
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    }

    cached.promise = connectWithRetry(opts)
  }

  try {
    cached.conn = await cached.promise
    return cached.conn
  } catch (error) {
    cached.promise = null
    throw error
  }
}

async function connectWithRetry(opts: mongoose.ConnectOptions, attempt = 1): Promise<typeof mongoose> {
  try {
    logger.info(`Connecting to MongoDB (attempt ${attempt}/${MAX_RETRIES})`)
    
    const conn = await mongoose.connect(MONGODB_URI, opts)
    
    logger.info('MongoDB connected successfully')
    
    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected')
      cached.conn = null
      cached.promise = null
    })

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB error', { metadata: { error: err.message } })
    })

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, closing MongoDB connection')
      await mongoose.connection.close()
      process.exit(0)
    })

    return conn
  } catch (error: any) {
    logger.error(`MongoDB connection failed (attempt ${attempt}/${MAX_RETRIES})`, {
      metadata: { error: error.message },
    })

    if (attempt < MAX_RETRIES) {
      logger.info(`Retrying in ${RETRY_DELAY}ms...`)
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
      return connectWithRetry(opts, attempt + 1)
    }

    throw error
  }
}

/**
 * Get database connection status
 */
export function getDbStatus() {
  return {
    isConnected: cached.conn?.connection?.readyState === 1,
    readyState: cached.conn?.connection?.readyState,
    retries: cached.retries,
  }
}

/**
 * Close database connection (for testing or graceful shutdown)
 */
export async function closeDatabase() {
  if (cached.conn) {
    await cached.conn.connection.close()
    cached.conn = null
    cached.promise = null
    logger.info('MongoDB connection closed')
  }
}