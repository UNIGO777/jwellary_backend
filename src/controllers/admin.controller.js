import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { isDBConnected } from '../config/db.js'
import { sendMail } from '../config/mailer.js'
import { adminOtpEmail } from '../EmailTamplates/index.js'
import { Category } from '../models/category.model.js'
import { Order } from '../models/order.model.js'
import { Product } from '../models/product.model.js'
import { PromoCode } from '../models/promocode.model.js'
import { User } from '../models/user.model.js'

const store = new Map()
const ttlMs = 10 * 60 * 1000
const maxAttempts = 5

const genOtp = () => String(Math.floor(100000 + Math.random() * 900000))
const dayKeyUtc = (d) => new Date(d).toISOString().slice(0, 10)

export const loginInit = async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ ok: false, message: 'Email and password are required' })

    const inputEmail = String(email).trim().toLowerCase()
    const inputPassword = String(password).trim()

    const adminEmail = String(env.admin.email || '').trim().toLowerCase()
    const adminPassword = String(env.admin.password || '').trim()

    if (!adminEmail || !adminPassword) return res.status(500).json({ ok: false, message: 'Admin credentials not configured' })

    if (inputEmail !== adminEmail || inputPassword !== adminPassword) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' })
    }
    const code = genOtp()
    const exp = Date.now() + ttlMs
    store.set(inputEmail, { code, exp, attempts: 0 })
    const emailContent = adminOtpEmail({ otp: code, expiresInMinutes: 10 })
    await sendMail({ to: inputEmail, subject: emailContent.subject, text: emailContent.text, html: emailContent.html })
    const payload = { ok: true, message: 'OTP sent' }
    if (env.nodeEnv !== 'production') payload.otp = code
    res.json(payload)
  } catch (err) {
    next(err)
  }
}

export const loginVerify = async (req, res, next) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) return res.status(400).json({ ok: false, message: 'Email and OTP are required' })
    const inputEmail = String(email).trim().toLowerCase()
    const entry = store.get(inputEmail)
    if (!entry) return res.status(400).json({ ok: false, message: 'OTP not requested' })
    if (entry.attempts >= maxAttempts) {
      store.delete(inputEmail)
      return res.status(429).json({ ok: false, message: 'Too many attempts' })
    }
    entry.attempts++
    if (Date.now() > entry.exp) {
      store.delete(inputEmail)
      return res.status(400).json({ ok: false, message: 'OTP expired' })
    }
    if (String(otp) !== entry.code) return res.status(400).json({ ok: false, message: 'Invalid OTP' })
    if (!env.jwtSecret) return res.status(500).json({ ok: false, message: 'JWT secret not configured' })
    store.delete(inputEmail)
    const token = jwt.sign({ sub: inputEmail, role: 'admin' }, env.jwtSecret, { expiresIn: '1d' })
    res.json({ ok: true, token })
  } catch (err) {
    next(err)
  }
}

export const me = (req, res) => {
  res.json({ ok: true, data: { email: req.admin?.email } })
}

export const analytics = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })

    const now = Date.now()
    const from7 = new Date(now - 7 * 24 * 60 * 60 * 1000)
    const from30 = new Date(now - 30 * 24 * 60 * 60 * 1000)

    const [
      productsTotal,
      ordersTotal,
      usersTotal,
      categoriesTotal,
      promocodesTotal,
      ordersLast7,
      ordersLast30,
      revenueLast30Agg,
      statusBreakdownAgg,
      ordersByDayAgg,
      recentOrders,
      topProductsAgg,
      lowStockAgg
    ] = await Promise.all([
      Product.countDocuments({}),
      Order.countDocuments({}),
      User.countDocuments({}),
      Category.countDocuments({}),
      PromoCode.countDocuments({}),
      Order.countDocuments({ createdAt: { $gte: from7 } }),
      Order.countDocuments({ createdAt: { $gte: from30 } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: from30 }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' }, subtotal: { $sum: '$subtotal' }, discount: { $sum: '$discount' } } }
      ]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { createdAt: { $gte: from7 } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $sort: { _id: 1 } }
      ]),
      Order.find({})
        .sort({ createdAt: -1 })
        .limit(8)
        .select({ total: 1, status: 1, createdAt: 1, customerEmail: 1, customerPhone: 1, shippingAddress: 1, items: 1 })
        .lean(),
      Order.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            qty: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
          }
        },
        { $sort: { qty: -1 } },
        { $limit: 6 }
      ]),
      Product.aggregate([
        { $project: { name: 1, slug: 1, isActive: 1, stock: 1 } },
        { $match: { stock: { $lte: 3 } } },
        { $sort: { stock: 1 } },
        { $limit: 8 }
      ])
    ])

    const revenueLast30 = Number(revenueLast30Agg?.[0]?.total || 0)
    const discountLast30 = Number(revenueLast30Agg?.[0]?.discount || 0)

    const byStatus = {}
    for (const row of statusBreakdownAgg || []) {
      if (!row?._id) continue
      byStatus[row._id] = Number(row.count || 0)
    }

    const days = []
    const countsByDay = new Map()
    for (const row of ordersByDayAgg || []) countsByDay.set(String(row._id), { count: Number(row.count || 0), revenue: Number(row.revenue || 0) })
    for (let i = 6; i >= 0; i--) {
      const key = dayKeyUtc(now - i * 24 * 60 * 60 * 1000)
      const v = countsByDay.get(key) || { count: 0, revenue: 0 }
      days.push({ day: key, orders: v.count, revenue: v.revenue })
    }

    const recent = (recentOrders || []).map((o) => ({
      _id: o._id,
      total: o.total,
      status: o.status,
      createdAt: o.createdAt,
      customerEmail: o.customerEmail,
      customerPhone: o.customerPhone,
      customerName: o.shippingAddress?.name,
      itemsCount: Array.isArray(o.items) ? o.items.reduce((sum, it) => sum + Number(it?.quantity || 0), 0) : 0
    }))

    const lowStock = (lowStockAgg || []).map((p) => ({
      _id: p._id,
      name: p.name,
      slug: p.slug,
      minStock: Number(p.stock || 0),
      isActive: Boolean(p.isActive)
    }))

    res.json({
      ok: true,
      data: {
        totals: {
          products: productsTotal,
          orders: ordersTotal,
          users: usersTotal,
          categories: categoriesTotal,
          promocodes: promocodesTotal
        },
        orders: {
          last7Days: ordersLast7,
          last30Days: ordersLast30,
          byStatus,
          byDay: days
        },
        revenue: { last30Days: revenueLast30, discountLast30 },
        topProducts: topProductsAgg || [],
        recentOrders: recent,
        lowStock
      }
    })
  } catch (err) {
    next(err)
  }
}
