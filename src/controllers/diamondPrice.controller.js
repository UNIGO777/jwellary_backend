import mongoose from 'mongoose'
import { DiamondPrice } from '../models/diamondPrice.model.js'
import { DiamondType } from '../models/diamondType.model.js'
import { isDBConnected } from '../config/db.js'

const isId = (id) => mongoose.isValidObjectId(id)

export const index = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const page = Number(req.query.page || 1)
    const limit = Number(req.query.limit || 20)
    const diamondTypeId = req.query.diamondTypeId ? String(req.query.diamondTypeId) : ''

    const filter = {}
    if (diamondTypeId) {
      if (!isId(diamondTypeId)) return res.status(400).json({ ok: false, message: 'Invalid diamondTypeId' })
      filter.diamondType = diamondTypeId
    }

    const data = await DiamondPrice.find(filter)
      .populate('diamondType')
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
    const total = await DiamondPrice.countDocuments(filter)
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
    const doc = await DiamondPrice.findById(id).populate('diamondType').lean()
    if (!doc) return res.status(404).json({ ok: false, message: 'Diamond price not found' })
    res.json({ ok: true, data: doc })
  } catch (err) {
    next(err)
  }
}

export const create = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const { diamondType, diamondTypeId, pricePerCarat } = req.body
    const typeId = diamondTypeId || diamondType
    if (!typeId) return res.status(400).json({ ok: false, message: 'Missing diamondTypeId' })
    if (!isId(typeId)) return res.status(400).json({ ok: false, message: 'Invalid diamondTypeId' })
    if (pricePerCarat === undefined) return res.status(400).json({ ok: false, message: 'Missing pricePerCarat' })

    const exists = await DiamondType.findById(typeId).lean()
    if (!exists) return res.status(404).json({ ok: false, message: 'Diamond type not found' })

    const doc = await DiamondPrice.create({
      diamondType: typeId,
      pricePerCarat: Number(pricePerCarat)
    })
    const out = await DiamondPrice.findById(doc._id).populate('diamondType').lean()
    res.status(201).json({ ok: true, data: out })
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

    if (data.diamondTypeId !== undefined || data.diamondType !== undefined) {
      const nextTypeId = data.diamondTypeId || data.diamondType
      if (!nextTypeId) return res.status(400).json({ ok: false, message: 'Missing diamondTypeId' })
      if (!isId(nextTypeId)) return res.status(400).json({ ok: false, message: 'Invalid diamondTypeId' })
      const exists = await DiamondType.findById(nextTypeId).lean()
      if (!exists) return res.status(404).json({ ok: false, message: 'Diamond type not found' })
      data.diamondType = nextTypeId
      delete data.diamondTypeId
    }

    if (data.pricePerCarat !== undefined) data.pricePerCarat = Number(data.pricePerCarat)
    if (data.date !== undefined) delete data.date

    const doc = await DiamondPrice.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate('diamondType')
      .lean()
    if (!doc) return res.status(404).json({ ok: false, message: 'Diamond price not found' })
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
    const ok = await DiamondPrice.findByIdAndDelete(id)
    if (!ok) return res.status(404).json({ ok: false, message: 'Diamond price not found' })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
