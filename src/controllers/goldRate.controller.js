import mongoose from 'mongoose'
import { GoldRate } from '../models/goldRate.model.js'
import { isDBConnected } from '../config/db.js'

const isId = (id) => mongoose.isValidObjectId(id)

export const index = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const page = Number(req.query.page || 1)
    const limit = Number(req.query.limit || 20)
    const carat = req.query.carat !== undefined ? Number(req.query.carat) : undefined

    const filter = {}
    if (carat !== undefined && !Number.isNaN(carat)) filter.carat = carat

    const data = await GoldRate.find(filter)
      .select('-city')
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
    const total = await GoldRate.countDocuments(filter)
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
    const doc = await GoldRate.findById(id).select('-city').lean()
    if (!doc) return res.status(404).json({ ok: false, message: 'Gold rate not found' })
    res.json({ ok: true, data: doc })
  } catch (err) {
    next(err)
  }
}

export const create = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const { carat, purity, ratePer10Gram } = req.body
    if (carat === undefined) return res.status(400).json({ ok: false, message: 'Missing carat' })
    if (purity === undefined) return res.status(400).json({ ok: false, message: 'Missing purity' })
    if (ratePer10Gram === undefined) return res.status(400).json({ ok: false, message: 'Missing ratePer10Gram' })

    const payload = {
      carat: Number(carat),
      purity: Number(purity),
      ratePer10Gram: Number(ratePer10Gram)
    }

    const doc = await GoldRate.create(payload)
    res.status(201).json({ ok: true, data: doc.toObject() })
  } catch (err) {
    next(err)
  }
}

export const updateOne = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const id = req.params.id
    if (!isId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' })
    const data = { ...req.body }
    if (data.carat !== undefined) data.carat = Number(data.carat)
    if (data.purity !== undefined) data.purity = Number(data.purity)
    if (data.ratePer10Gram !== undefined) data.ratePer10Gram = Number(data.ratePer10Gram)
    if (data.city !== undefined) delete data.city
    if (data.date !== undefined) delete data.date

    const doc = await GoldRate.findByIdAndUpdate(id, data, { new: true, runValidators: true }).select('-city').lean()
    if (!doc) return res.status(404).json({ ok: false, message: 'Gold rate not found' })
    res.json({ ok: true, data: doc })
  } catch (err) {
    next(err)
  }
}

export const remove = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const id = req.params.id
    if (!isId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' })
    const ok = await GoldRate.findByIdAndDelete(id)
    if (!ok) return res.status(404).json({ ok: false, message: 'Gold rate not found' })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
