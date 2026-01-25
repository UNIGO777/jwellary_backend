import mongoose from 'mongoose'
import { isDBConnected } from '../config/db.js'
import { Order } from '../models/order.model.js'
import { Product } from '../models/product.model.js'
import { PromoCode } from '../models/promocode.model.js'

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
    doc.status = status
    const saved = await doc.save()
    res.json({ ok: true, data: saved.toObject() })
  } catch (err) {
    next(err)
  }
}
