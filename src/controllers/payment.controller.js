import mongoose from 'mongoose'
import crypto from 'crypto'
import { isDBConnected } from '../config/db.js'
import { env } from '../config/env.js'
import { Payment } from '../models/payment.model.js'
import { Order } from '../models/order.model.js'
import Razorpay from 'razorpay'

const isId = (id) => mongoose.isValidObjectId(id)

const getRazorpay = () => {
  if (!env.razorpay?.keyId || !env.razorpay?.keySecret) return null
  return new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret })
}

const safeEqual = (a, b) => {
  const aBuf = Buffer.from(String(a || ''), 'utf8')
  const bBuf = Buffer.from(String(b || ''), 'utf8')
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

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

export const razorpayCreateOrder = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const userId = req.user?.id
    if (!isId(userId)) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const instance = getRazorpay()
    if (!instance) return res.status(503).json({ ok: false, message: 'Razorpay not configured (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend .env)' })

    const { orderId, method } = req.body
    if (!orderId || !isId(orderId)) return res.status(400).json({ ok: false, message: 'Invalid orderId' })

    const order = await Order.findOne({ _id: orderId, user: userId })
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' })

    if (order.payment) {
      const existing = await Payment.findOne({ _id: order.payment, user: userId, order: orderId }).lean()
      const existingOrder = existing?.meta?.razorpayOrder
      if (existing?.provider === 'razorpay' && existingOrder?.id) {
        return res.json({ ok: true, data: { keyId: env.razorpay.keyId, razorpayOrder: existingOrder, paymentId: existing._id } })
      }
    }

    const amountPaise = Math.max(0, Math.round(Number(order.total || 0) * 100))
    const currency = 'INR'
    const receipt = String(order._id)

    const razorpayOrder = await instance.orders.create({
      amount: amountPaise,
      currency,
      receipt,
      notes: { orderId: String(order._id), userId: String(userId) }
    })

    const payment = await Payment.create({
      user: userId,
      order: orderId,
      provider: 'razorpay',
      method: method ? String(method).trim().toLowerCase() : 'card',
      amount: Number(order.total || 0),
      currency,
      status: 'created',
      transactionId: '',
      meta: { razorpay_order_id: razorpayOrder.id, razorpayOrder }
    })

    order.payment = payment._id
    await order.save()

    res.status(201).json({ ok: true, data: { keyId: env.razorpay.keyId, razorpayOrder, paymentId: payment._id } })
  } catch (err) {
    next(err)
  }
}

export const razorpayVerify = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const userId = req.user?.id
    if (!isId(userId)) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const instance = getRazorpay()
    if (!instance) return res.status(503).json({ ok: false, message: 'Razorpay not configured (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend .env)' })

    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
    if (!orderId || !isId(orderId)) return res.status(400).json({ ok: false, message: 'Invalid orderId' })
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ ok: false, message: 'Missing Razorpay verification fields' })
    }

    const order = await Order.findOne({ _id: orderId, user: userId })
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' })
    if (!order.payment || !isId(order.payment)) return res.status(400).json({ ok: false, message: 'Payment not created for order' })

    const payment = await Payment.findOne({ _id: order.payment, user: userId, order: orderId })
    if (!payment) return res.status(404).json({ ok: false, message: 'Payment not found' })
    if (payment.provider !== 'razorpay') return res.status(400).json({ ok: false, message: 'Payment provider mismatch' })

    const payload = `${String(razorpay_order_id)}|${String(razorpay_payment_id)}`
    const expected = crypto.createHmac('sha256', env.razorpay.keySecret).update(payload).digest('hex')
    const valid = safeEqual(expected, razorpay_signature)
    if (!valid) {
      payment.status = 'failed'
      payment.meta = { ...(payment.meta || {}), razorpay_order_id, razorpay_payment_id, razorpay_signature, reason: 'invalid_signature' }
      await payment.save()
      return res.status(400).json({ ok: false, message: 'Invalid Razorpay signature' })
    }

    const rpPayment = await instance.payments.fetch(String(razorpay_payment_id))
    if (rpPayment?.order_id && String(rpPayment.order_id) !== String(razorpay_order_id)) {
      payment.status = 'failed'
      payment.meta = { ...(payment.meta || {}), razorpay_order_id, razorpay_payment_id, razorpay_signature, reason: 'order_id_mismatch' }
      await payment.save()
      return res.status(400).json({ ok: false, message: 'Payment order mismatch' })
    }
    const expectedAmountPaise = Math.max(0, Math.round(Number(order.total || 0) * 100))
    if (rpPayment?.amount !== undefined && Number(rpPayment.amount) !== expectedAmountPaise) {
      payment.status = 'failed'
      payment.meta = { ...(payment.meta || {}), razorpay_order_id, razorpay_payment_id, razorpay_signature, reason: 'amount_mismatch' }
      await payment.save()
      return res.status(400).json({ ok: false, message: 'Payment amount mismatch' })
    }

    const rpStatus = String(rpPayment?.status || '').toLowerCase()
    const nextStatus = rpStatus === 'captured' ? 'captured' : rpStatus === 'authorized' ? 'authorized' : 'captured'

    const meta = { ...(payment.meta || {}), razorpay_order_id, razorpay_payment_id, razorpay_signature, razorpay_payment: rpPayment }
    payment.status = nextStatus
    payment.transactionId = String(razorpay_payment_id)
    payment.meta = meta
    const saved = await payment.save()

    if (order.status === 'pending') {
      order.status = 'confirmed'
      await order.save()
    }

    res.json({ ok: true, data: saved.toObject() })
  } catch (err) {
    next(err)
  }
}
