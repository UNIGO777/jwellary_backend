import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import { env } from './config/env.js'
import routes from './routes/index.js'
import productRoutes from './routes/product.routes.js'
import filesRoutes from './routes/files.routes.js'
import categoryRoutes from './routes/category.routes.js'
import subCategoryRoutes from './routes/subcategory.routes.js'
import adminRoutes from './routes/admin.routes.js'
import swaggerUi from 'swagger-ui-express'
import { openapiSpec } from './config/openapi.js'
import { connectDB } from './config/db.js'
import { errorHandler, notFound } from './middlewares/error.js'

const app = express()

connectDB().catch((err) => {
  console.error('MongoDB connection error:', err?.message || err)
})

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false
  })
)
app.use(cors({ origin: env.corsOrigin }))
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

app.get('/health', (req, res) => res.json({ ok: true }))
app.get('/api', (req, res) => res.json({ ok: true }))

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec))

app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/subcategories', subCategoryRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/files', filesRoutes)
app.use('/api', routes)

app.use('/uploads', express.static(path.resolve(env.uploadDir)))

app.use(notFound)
app.use(errorHandler)

export default app
