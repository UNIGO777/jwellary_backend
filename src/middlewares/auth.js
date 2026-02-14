import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { isDBConnected } from '../config/db.js'
import { User } from '../models/user.model.js'

export const authAdmin = (req, res, next) => {
  try {
    const header = req.headers.authorization || ''
    if (!header.startsWith('Bearer ')) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const token = header.slice(7)
    if (!env.jwtSecret) return res.status(500).json({ ok: false, message: 'JWT secret not configured' })
    const payload = jwt.verify(token, env.jwtSecret)
    if (payload.role !== 'admin') return res.status(401).json({ ok: false, message: 'Unauthorized' })
    req.admin = { email: payload.sub }
    next()
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Invalid token' })
  }
}

export const authUser = async (req, res, next) => {
  try {
    const header = req.headers.authorization || ''
    if (!header.startsWith('Bearer ')) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const token = header.slice(7)
    if (!env.jwtSecret) return res.status(500).json({ ok: false, message: 'JWT secret not configured' })
    const payload = jwt.verify(token, env.jwtSecret)
    if (payload.role !== 'user') return res.status(401).json({ ok: false, message: 'Unauthorized' })
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const userId = payload.sub
    if (!mongoose.isValidObjectId(userId)) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const user = await User.findById(userId).select({ isBlocked: 1 }).lean()
    if (!user) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    if (user.isBlocked) return res.status(403).json({ ok: false, message: 'Account blocked' })
    req.user = { id: userId }
    next()
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Invalid token' })
  }
}
