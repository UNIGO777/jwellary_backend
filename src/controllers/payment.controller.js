import mongoose from 'mongoose'
import { isDBConnected } from '../config/db.js'
import { Payment } from '../models/payment.model.js'
import { Order } from '../models/order.model.js'

const isId = (id) => mongoose.isValidObjectId(id)

export const create = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const userId = req.user?.id
    if (!isId(userId)) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const { orderId, provider, method, amount, currency, transactionId, meta } = req.body
    if (!orderId || !isId(orderId)) return res.status(400).json({ ok: false, message: 'Invalid orderId' })
    if (!provider || !method) return res.status(400).json({ ok: false, message: 'provider and method are required' })

    const nAmount = Number(amount)
    if (Number.isNaN(nAmount) || nAmount < 0) return res.status(400).json({ ok: false, message: 'Invalid amount' })

    const order = await Order.findOne({ _id: orderId, user: userId })
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' })

    const payment = await Payment.create({
      user: userId,
      order: orderId,
      provider: String(provider).trim(),
      method: String(method).trim(),
      amount: nAmount,
      currency: currency ? String(currency).trim() : undefined,
      transactionId: transactionId ? String(transactionId).trim() : undefined,
      meta
    })

    order.payment = payment._id
    await order.save()

    const created = await Payment.findById(payment._id).lean()
    res.status(201).json({ ok: true, data: created })
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
    const doc = await Payment.findOne({ _id: id, user: userId }).lean()
    if (!doc) return res.status(404).json({ ok: false, message: 'Payment not found' })
    res.json({ ok: true, data: doc })
  } catch (err) {
    next(err)
  }
}

export const setStatus = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const userId = req.user?.id
    if (!isId(userId)) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const id = req.params.id
    if (!isId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' })
    const { status, transactionId, meta } = req.body
    if (!status) return res.status(400).json({ ok: false, message: 'Missing status' })

    const doc = await Payment.findOne({ _id: id, user: userId })
    if (!doc) return res.status(404).json({ ok: false, message: 'Payment not found' })
    doc.status = status
    if (transactionId !== undefined) doc.transactionId = transactionId ? String(transactionId).trim() : undefined
    if (meta !== undefined) doc.meta = meta
    const saved = await doc.save()
    res.json({ ok: true, data: saved.toObject() })
  } catch (err) {
    next(err)
  }
}
