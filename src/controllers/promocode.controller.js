import mongoose from 'mongoose'
import { isDBConnected } from '../config/db.js'
import { PromoCode } from '../models/promocode.model.js'

const isId = (id) => mongoose.isValidObjectId(id)

const normalizeCode = (code) => String(code || '').trim().toUpperCase()

const computeDiscount = ({ promo, orderTotal }) => {
  const total = Number(orderTotal)
  if (Number.isNaN(total) || total < 0) return null

  if (!promo?.isActive) return { ok: false, message: 'Promo code inactive' }
  if (promo.startsAt && Date.now() < new Date(promo.startsAt).getTime()) return { ok: false, message: 'Promo code not started' }
  if (promo.endsAt && Date.now() > new Date(promo.endsAt).getTime()) return { ok: false, message: 'Promo code expired' }
  if (promo.usageLimit !== undefined && promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
    return { ok: false, message: 'Promo code usage limit reached' }
  }
  if (promo.minOrderValue !== undefined && promo.minOrderValue !== null && total < promo.minOrderValue) {
    return { ok: false, message: `Minimum order value is ${promo.minOrderValue}` }
  }

  let discount = 0
  if (promo.discountType === 'percent') {
    discount = (total * Number(promo.amount || 0)) / 100
  } else if (promo.discountType === 'fixed') {
    discount = Number(promo.amount || 0)
  } else {
    return { ok: false, message: 'Invalid discount type' }
  }

  if (Number.isNaN(discount) || discount < 0) discount = 0
  if (promo.maxDiscount !== undefined && promo.maxDiscount !== null) {
    discount = Math.min(discount, Number(promo.maxDiscount || 0))
  }
  discount = Math.min(discount, total)

  const totalAfter = total - discount
  return { ok: true, discount, totalAfter }
}

export const index = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const page = Number(req.query.page || 1)
    const limit = Number(req.query.limit || 20)
    const q = (req.query.q || '').toString().trim().toUpperCase()
    const filter = {}
    if (q) filter.code = { $regex: q, $options: 'i' }
    const data = await PromoCode.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean()
    const total = await PromoCode.countDocuments(filter)
    res.json({ ok: true, data, page, limit, total })
  } catch (err) {
    next(err)
  }
}

export const show = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const id = req.params.id
    if (!isId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' })
    const doc = await PromoCode.findById(id).lean()
    if (!doc) return res.status(404).json({ ok: false, message: 'Promo code not found' })
    res.json({ ok: true, data: doc })
  } catch (err) {
    next(err)
  }
}

export const create = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const data = { ...req.body }
    data.code = normalizeCode(data.code)
    if (!data.code) return res.status(400).json({ ok: false, message: 'Missing code' })
    if (!data.discountType) return res.status(400).json({ ok: false, message: 'Missing discountType' })
    if (data.amount === undefined) return res.status(400).json({ ok: false, message: 'Missing amount' })
    const doc = await PromoCode.create(data)
    res.status(201).json({ ok: true, data: doc.toObject() })
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ ok: false, message: 'Promo code already exists' })
    next(err)
  }
}

export const updateOne = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const id = req.params.id
    if (!isId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' })
    const doc = await PromoCode.findById(id)
    if (!doc) return res.status(404).json({ ok: false, message: 'Promo code not found' })

    const data = { ...req.body }
    if (data.code !== undefined) doc.code = normalizeCode(data.code)
    if (data.description !== undefined) doc.description = data.description
    if (data.discountType !== undefined) doc.discountType = data.discountType
    if (data.amount !== undefined) doc.amount = data.amount
    if (data.maxDiscount !== undefined) doc.maxDiscount = data.maxDiscount
    if (data.minOrderValue !== undefined) doc.minOrderValue = data.minOrderValue
    if (data.startsAt !== undefined) doc.startsAt = data.startsAt
    if (data.endsAt !== undefined) doc.endsAt = data.endsAt
    if (data.usageLimit !== undefined) doc.usageLimit = data.usageLimit
    if (data.usedCount !== undefined) doc.usedCount = data.usedCount
    if (data.isActive !== undefined) doc.isActive = Boolean(data.isActive)
    if (data.applicableCategories !== undefined) doc.applicableCategories = data.applicableCategories
    if (data.applicableSubCategories !== undefined) doc.applicableSubCategories = data.applicableSubCategories
    if (data.applicableProducts !== undefined) doc.applicableProducts = data.applicableProducts

    const saved = await doc.save()
    res.json({ ok: true, data: saved.toObject() })
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ ok: false, message: 'Promo code already exists' })
    next(err)
  }
}

export const remove = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const id = req.params.id
    if (!isId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' })
    const ok = await PromoCode.findByIdAndDelete(id)
    if (!ok) return res.status(404).json({ ok: false, message: 'Promo code not found' })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

export const validate = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const { code, orderTotal } = req.body
    const normalized = normalizeCode(code)
    if (!normalized) return res.status(400).json({ ok: false, message: 'Missing code' })
    const promo = await PromoCode.findOne({ code: normalized }).lean()
    if (!promo) return res.status(404).json({ ok: false, message: 'Promo code not found' })
    const result = computeDiscount({ promo, orderTotal })
    if (!result) return res.status(400).json({ ok: false, message: 'Invalid orderTotal' })
    if (!result.ok) return res.status(400).json({ ok: false, message: result.message })
    res.json({ ok: true, data: { promo, discount: result.discount, totalAfter: result.totalAfter } })
  } catch (err) {
    next(err)
  }
}
