import mongoose from 'mongoose'
import { isDBConnected } from '../config/db.js'
import { Cart } from '../models/cart.model.js'
import { Product } from '../models/product.model.js'

const isId = (id) => mongoose.isValidObjectId(id)

export const list = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const userId = req.user?.id
    if (!isId(userId)) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const data = await Cart.find({ user: userId }).populate('product').sort({ createdAt: -1 }).lean()
    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
}

export const add = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const userId = req.user?.id
    if (!isId(userId)) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const { productId } = req.body
    if (!productId || !isId(productId)) return res.status(400).json({ ok: false, message: 'Invalid productId' })

    const product = await Product.findById(productId).lean()
    if (!product) return res.status(404).json({ ok: false, message: 'Product not found' })

    try {
      const doc = await Cart.create({ user: userId, product: productId })
      const populated = await Cart.findById(doc._id).populate('product').lean()
      return res.status(201).json({ ok: true, data: populated })
    } catch (err) {
      if (err?.code === 11000) {
        const existing = await Cart.findOne({ user: userId, product: productId }).populate('product').lean()
        return res.json({ ok: true, data: existing })
      }
      throw err
    }
  } catch (err) {
    next(err)
  }
}

export const remove = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const userId = req.user?.id
    if (!isId(userId)) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const productId = req.params.productId
    if (!productId || !isId(productId)) return res.status(400).json({ ok: false, message: 'Invalid productId' })
    await Cart.deleteOne({ user: userId, product: productId })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
