import mongoose from 'mongoose'
import { env } from './env.js'

let connected = false

export const isDBConnected = () => connected

export const connectDB = async () => {
  if (!env.mongoUri) {
    connected = false
    throw new Error('MongoDB URI not set')
  }
  try {
    await mongoose.connect(env.mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000
    })
    connected = true
    console.log('MongoDB connected')
    return true
  } catch (err) {
    connected = false
    console.error('MongoDB connection error:', err.message)
    throw err
  }
}

mongoose.connection.on('disconnected', () => {
  connected = false
})

mongoose.connection.on('connected', () => {
  connected = true
})

mongoose.connection.on('reconnected', () => {
  connected = true
})

