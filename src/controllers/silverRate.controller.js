import mongoose from 'mongoose'
import { SilverRate } from '../models/silverRate.model.js'
import { isDBConnected } from '../config/db.js'

const isId = (id) => mongoose.isValidObjectId(id)

export const index = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const page = Number(req.query.page || 1)
    const limit = Number(req.query.limit || 20)
    const purityMark = req.query.purityMark !== undefined ? Number(req.query.purityMark) : undefined

    const filter = {}
    if (purityMark !== undefined && !Number.isNaN(purityMark)) filter.purityMark = purityMark

    const data = await SilverRate.find(filter)
      .select('-city')
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
    const total = await SilverRate.countDocuments(filter)
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
    const doc = await SilverRate.findById(id).select('-city').lean()
    if (!doc) return res.status(404).json({ ok: false, message: 'Silver rate not found' })
    res.json({ ok: true, data: doc })
  } catch (err) {
    next(err)
  }
}

export const create = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const { purityMark, purityPercent, ratePerKg } = req.body
    if (purityMark === undefined) return res.status(400).json({ ok: false, message: 'Missing purityMark' })
    if (purityPercent === undefined) return res.status(400).json({ ok: false, message: 'Missing purityPercent' })
    if (ratePerKg === undefined) return res.status(400).json({ ok: false, message: 'Missing ratePerKg' })

    const payload = {
      purityMark: Number(purityMark),
      purityPercent: Number(purityPercent),
      ratePerKg: Number(ratePerKg)
    }

    const doc = await SilverRate.create(payload)
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
    if (data.purityMark !== undefined) data.purityMark = Number(data.purityMark)
    if (data.purityPercent !== undefined) data.purityPercent = Number(data.purityPercent)
    if (data.ratePerKg !== undefined) data.ratePerKg = Number(data.ratePerKg)
    if (data.city !== undefined) delete data.city
    if (data.date !== undefined) delete data.date

    const doc = await SilverRate.findByIdAndUpdate(id, data, { new: true, runValidators: true }).select('-city').lean()
    if (!doc) return res.status(404).json({ ok: false, message: 'Silver rate not found' })
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
    const ok = await SilverRate.findByIdAndDelete(id)
    if (!ok) return res.status(404).json({ ok: false, message: 'Silver rate not found' })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
