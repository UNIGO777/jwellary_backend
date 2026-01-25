import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

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

export const authUser = (req, res, next) => {
  try {
    const header = req.headers.authorization || ''
    if (!header.startsWith('Bearer ')) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const token = header.slice(7)
    if (!env.jwtSecret) return res.status(500).json({ ok: false, message: 'JWT secret not configured' })
    const payload = jwt.verify(token, env.jwtSecret)
    if (payload.role !== 'user') return res.status(401).json({ ok: false, message: 'Unauthorized' })
    req.user = { id: payload.sub }
    next()
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Invalid token' })
  }
}
