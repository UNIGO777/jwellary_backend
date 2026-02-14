import app from './app.js'
import { env } from './config/env.js'
import { connectDB } from './config/db.js'
import fs from 'fs'
import path from 'path'

const dir = path.resolve(env.uploadDir)
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

const start = async () => {
  await connectDB()
  const server = app.listen(env.port, env.host, () => {
    const url = `http://localhost:${env.port}`
    console.log(`Server started at ${url}`)
  })

  process.on('SIGINT', () => {
    server.close(() => {
      process.exit(0)
    })
  })
  process.on('SIGTERM', () => {
    server.close(() => {
      process.exit(0)
    })
  })
}

start().catch((err) => {
  console.error(err?.message || err)
  process.exit(1)
})
