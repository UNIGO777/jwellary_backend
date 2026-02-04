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
import userRoutes from './routes/user.routes.js'
import cartRoutes from './routes/cart.routes.js'
import promocodeRoutes from './routes/promocode.routes.js'
import orderRoutes from './routes/order.routes.js'
import paymentRoutes from './routes/payment.routes.js'
import goldRateRoutes from './routes/goldRate.routes.js'
import silverRateRoutes from './routes/silverRate.routes.js'
import diamondTypeRoutes from './routes/diamondType.routes.js'
import diamondPriceRoutes from './routes/diamondPrice.routes.js'
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
app.use('/api/users', userRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/promocodes', promocodeRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/files', filesRoutes)
app.use('/api/admin/gold-rates', goldRateRoutes)
app.use('/api/admin/silver-rates', silverRateRoutes)
app.use('/api/admin/diamond-types', diamondTypeRoutes)
app.use('/api/admin/diamond-prices', diamondPriceRoutes)
app.use('/api', routes)

app.use('/uploads', express.static(path.resolve(env.uploadDir)))
app.use('/uploads', (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(404).end()
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="100%" height="100%" fill="#f4f4f5"/><path d="M240 270l46-60 54 70 40-50 60 80H220z" fill="#d4d4d8"/><circle cx="260" cy="190" r="18" fill="#d4d4d8"/><text x="50%" y="82%" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="18" fill="#71717a">Missing upload</text></svg>'
  res
    .status(404)
    .set('Content-Type', 'image/svg+xml; charset=utf-8')
    .set('Cache-Control', 'no-store')
    .send(svg)
})

app.use(notFound)
app.use(errorHandler)

export default app
