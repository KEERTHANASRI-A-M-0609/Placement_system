import dns from 'node:dns'
import mongoose from 'mongoose'
import { logger } from '../utils/logger'
import { config } from './env'

dns.setDefaultResultOrder('ipv4first')
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])

let connecting = false
let retryTimer: ReturnType<typeof setInterval> | null = null

export const isDbConnected = () => mongoose.connection.readyState === 1

function maskUri(uri: string) {
  return uri.replace(/:([^:@/]+)@/, ':****@')
}

function connectionCandidates(): string[] {
  if (config.mongodb.uriDirect) {
    return [config.mongodb.uriDirect]
  }
  return [config.mongodb.uri]
}

async function tryConnect(uri: string): Promise<boolean> {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
      retryWrites: true,
    })
    const { host, name } = mongoose.connection
    logger.info(`✅ MongoDB connected (${maskUri(uri)}): ${host}/${name}`)
    return true
  } catch (error) {
    const msg = (error as Error).message
    logger.warn(`MongoDB attempt failed (${maskUri(uri)}): ${msg}`)
    if (msg.includes('whitelist') || msg.includes('IP')) {
      logger.error('→ Add your IP (or 0.0.0.0/0 for dev) in MongoDB Atlas → Network Access')
    }
    try { await mongoose.disconnect() } catch { /* ignore */ }
    return false
  }
}

export const connectDB = async (): Promise<boolean> => {
  if (isDbConnected()) return true
  if (connecting) return false

  connecting = true
  let connected = false
  for (const uri of connectionCandidates()) {
    if (await tryConnect(uri)) {
      connected = true
      break
    }
  }
  connecting = false

  if (!connected) {
    logger.error('❌ MongoDB unavailable — API runs in degraded mode. Data will not persist until DB connects.')
  }
  return connected
}

export function startDbRetryLoop(onConnected?: () => void) {
  if (retryTimer) return
  retryTimer = setInterval(async () => {
    if (isDbConnected()) return
    const ok = await connectDB()
    if (ok && onConnected) onConnected()
  }, 20000)
}

export const disconnectDB = async () => {
  if (retryTimer) {
    clearInterval(retryTimer)
    retryTimer = null
  }
  if (!isDbConnected()) return
  await mongoose.disconnect()
  logger.info('✅ MongoDB disconnected')
}

mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to MongoDB')
})

mongoose.connection.on('error', (err) => {
  if (connecting) return
  logger.error('Mongoose connection error:', err)
})

mongoose.connection.on('disconnected', () => {
  logger.info('Mongoose disconnected from MongoDB')
})
