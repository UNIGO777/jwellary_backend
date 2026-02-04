import mongoose from 'mongoose'
import { DiamondType } from '../models/diamondType.model.js'
import { isDBConnected } from '../config/db.js'

const isId = (id) => mongoose.isValidObjectId(id)

export const index = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const page = Number(req.query.page || 1)
    const limit = Number(req.query.limit || 50)
    const q = (req.query.q || '').toString().trim()

    const filter = {}
    if (q) {
      filter.$or = [
        { origin: { $regex: q, $options: 'i' } },
        { shape: { $regex: q, $options: 'i' } },
        { cut: { $regex: q, $options: 'i' } },
        { color: { $regex: q, $options: 'i' } },
        { clarity: { $regex: q, $options: 'i' } }
      ]
    }

    const data = await DiamondType.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
    const total = await DiamondType.countDocuments(filter)
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
    const doc = await DiamondType.findById(id).lean()
    if (!doc) return res.status(404).json({ ok: false, message: 'Diamond type not found' })
    res.json({ ok: true, data: doc })
  } catch (err) {
    next(err)
  }
}

export const create = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const { origin, shape, cut, color, clarity } = req.body
    if (!origin) return res.status(400).json({ ok: false, message: 'Missing origin' })
    if (!shape) return res.status(400).json({ ok: false, message: 'Missing shape' })
    if (!cut) return res.status(400).json({ ok: false, message: 'Missing cut' })
    if (!color) return res.status(400).json({ ok: false, message: 'Missing color' })
    if (!clarity) return res.status(400).json({ ok: false, message: 'Missing clarity' })

    const doc = await DiamondType.create({
      origin: String(origin).trim(),
      shape: String(shape).trim(),
      cut: String(cut).trim(),
      color: String(color).trim(),
      clarity: String(clarity).trim()
    })
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
    if (data.origin !== undefined) data.origin = String(data.origin).trim()
    if (data.shape !== undefined) data.shape = String(data.shape).trim()
    if (data.cut !== undefined) data.cut = String(data.cut).trim()
    if (data.color !== undefined) data.color = String(data.color).trim()
    if (data.clarity !== undefined) data.clarity = String(data.clarity).trim()

    const doc = await DiamondType.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean()
    if (!doc) return res.status(404).json({ ok: false, message: 'Diamond type not found' })
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
    const ok = await DiamondType.findByIdAndDelete(id)
    if (!ok) return res.status(404).json({ ok: false, message: 'Diamond type not found' })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
