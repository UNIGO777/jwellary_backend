import mongoose from 'mongoose'
import { isDBConnected } from '../config/db.js'
import { env } from '../config/env.js'
import { sendMail } from '../config/mailer.js'
import { adminNewOrderEmail, customerOrderConfirmedEmail, customerOrderStatusUpdatedEmail } from '../EmailTamplates/index.js'
import { Order } from '../models/order.model.js'
import { Product } from '../models/product.model.js'
import { PromoCode } from '../models/promocode.model.js'
import { User } from '../models/user.model.js'

const isId = (id) => mongoose.isValidObjectId(id)

const normalizeItem = async (input) => {
  const productId = input?.product
  if (!isId(productId)) return null
  const quantity = Number(input?.quantity)
  if (Number.isNaN(quantity) || quantity < 1) return null

  const product = await Product.findById(productId).lean()
  if (!product) return null

  const name = input?.name ? String(input.name).trim() : String(product.name || '').trim()
  const price = Number(input?.price)
  if (Number.isNaN(price) || price < 0) return null

  const out = {
    product: productId,
    name: name || 'Product',
    price,
    quantity
  }
  if (input?.image) out.image = String(input.image).trim()
  return out
}

export const index = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const userId = req.user?.id
    if (!isId(userId)) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const page = Number(req.query.page || 1)
    const limit = Number(req.query.limit || 20)
    const data = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('promocode')
      .populate('payment')
      .lean()
    const total = await Order.countDocuments({ user: userId })
    res.json({ ok: true, data, page, limit, total })
  } catch (err) {
    next(err)
  }
}

export const adminIndex = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const page = Number(req.query.page || 1)
    const limit = Number(req.query.limit || 20)
    const data = await Order.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user')
      .populate('promocode')
      .populate('payment')
      .lean()
    const total = await Order.countDocuments({})
    res.json({ ok: true, data, page, limit, total })
  } catch (err) {
    next(err)
  }
}

export const show = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const userId = req.user?.id
    if (!isId(userId)) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const id = req.params.id
    if (!isId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' })
    const doc = await Order.findOne({ _id: id, user: userId }).populate('promocode').populate('payment').lean()
    if (!doc) return res.status(404).json({ ok: false, message: 'Order not found' })
    res.json({ ok: true, data: doc })
  } catch (err) {
    next(err)
  }
}

export const create = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const userId = req.user?.id
    if (!isId(userId)) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const { items, subtotal, discount, total, promocodeId, customerEmail, customerPhone, shippingAddress, notes } = req.body
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ ok: false, message: 'Missing items' })

    const normalizedItems = []
    for (const item of items) {
      const n = await normalizeItem(item)
      if (!n) return res.status(400).json({ ok: false, message: 'Invalid items' })
      normalizedItems.push(n)
    }

    const nSubtotal = Number(subtotal)
    const nDiscount = discount === undefined ? 0 : Number(discount)
    const nTotal = Number(total)
    if (Number.isNaN(nSubtotal) || nSubtotal < 0) return res.status(400).json({ ok: false, message: 'Invalid subtotal' })
    if (Number.isNaN(nDiscount) || nDiscount < 0) return res.status(400).json({ ok: false, message: 'Invalid discount' })
    if (Number.isNaN(nTotal) || nTotal < 0) return res.status(400).json({ ok: false, message: 'Invalid total' })

    let promo = undefined
    if (promocodeId) {
      if (!isId(promocodeId)) return res.status(400).json({ ok: false, message: 'Invalid promocodeId' })
      const exists = await PromoCode.findById(promocodeId).lean()
      if (!exists) return res.status(404).json({ ok: false, message: 'Promo code not found' })
      promo = promocodeId
    }

    const doc = await Order.create({
      user: userId,
      items: normalizedItems,
      subtotal: nSubtotal,
      discount: nDiscount,
      total: nTotal,
      promocode: promo,
      customerEmail: customerEmail ? String(customerEmail).trim() : undefined,
      customerPhone: customerPhone ? String(customerPhone).trim() : undefined,
      shippingAddress,
      notes
    })

    const created = await Order.findById(doc._id).populate('promocode').lean()
    const user = await User.findById(userId).select({ email: 1, fullName: 1 }).lean()

    const customerTo = (created?.customerEmail || user?.email || '').trim()
    const adminTo = (env.admin.email || env.mail.to || env.mail.from || '').trim()

    if (adminTo) {
      const tpl = adminNewOrderEmail({ order: created, user })
      sendMail({ to: adminTo, subject: tpl.subject, text: tpl.text, html: tpl.html }).catch(() => {})
    }
    if (customerTo) {
      const tpl = customerOrderConfirmedEmail({ order: created })
      sendMail({ to: customerTo, subject: tpl.subject, text: tpl.text, html: tpl.html }).catch(() => {})
    }

    res.status(201).json({ ok: true, data: created })
  } catch (err) {
    next(err)
  }
}

export const setStatus = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const id = req.params.id
    if (!isId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' })
    const { status } = req.body
    if (!status) return res.status(400).json({ ok: false, message: 'Missing status' })
    const doc = await Order.findById(id)
    if (!doc) return res.status(404).json({ ok: false, message: 'Order not found' })
    const previousStatus = doc.status
    doc.status = status
    const saved = await doc.save()
    if (String(previousStatus) !== String(status)) {
      const user = doc.user ? await User.findById(doc.user).select({ email: 1, fullName: 1 }).lean() : null
      const customerTo = (doc.customerEmail || user?.email || '').trim()
      if (customerTo) {
        const tpl = customerOrderStatusUpdatedEmail({ order: saved.toObject(), previousStatus, nextStatus: status })
        sendMail({ to: customerTo, subject: tpl.subject, text: tpl.text, html: tpl.html }).catch(() => {})
      }
    }
    res.json({ ok: true, data: saved.toObject() })
  } catch (err) {
    next(err)
  }
}

export const setDelivery = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const id = req.params.id
    if (!isId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' })

    const doc = await Order.findById(id)
    if (!doc) return res.status(404).json({ ok: false, message: 'Order not found' })

    const payload = req.body && typeof req.body === 'object' ? req.body : {}
    const nextDelivery = { ...(doc.delivery ? doc.delivery.toObject?.() || doc.delivery : {}) }

    if (payload.provider !== undefined) nextDelivery.provider = payload.provider ? String(payload.provider).trim() : undefined
    if (payload.trackingId !== undefined) nextDelivery.trackingId = payload.trackingId ? String(payload.trackingId).trim() : undefined
    if (payload.trackingUrl !== undefined) nextDelivery.trackingUrl = payload.trackingUrl ? String(payload.trackingUrl).trim() : undefined
    if (payload.status !== undefined) {
      const s = payload.status ? String(payload.status).trim() : ''
      if (s) nextDelivery.status = s
    }
    if (payload.shippedAt !== undefined) {
      const d = payload.shippedAt ? new Date(payload.shippedAt) : null
      if (d && !Number.isNaN(d.getTime())) nextDelivery.shippedAt = d
    }
    if (payload.deliveredAt !== undefined) {
      const d = payload.deliveredAt ? new Date(payload.deliveredAt) : null
      if (d && !Number.isNaN(d.getTime())) nextDelivery.deliveredAt = d
    }

    doc.delivery = nextDelivery
    const saved = await doc.save()
    res.json({ ok: true, data: saved.toObject() })
  } catch (err) {
    next(err)
  }
}
