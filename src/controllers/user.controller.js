import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { promisify } from 'util'
import { env } from '../config/env.js'
import { isDBConnected } from '../config/db.js'
import { sendMail } from '../config/mailer.js'
import { userLoginOtpEmail, userSignupOtpEmail } from '../EmailTamplates/index.js'
import { User } from '../models/user.model.js'

const scryptAsync = promisify(crypto.scrypt)
const isId = (id) => mongoose.isValidObjectId(id)

const store = new Map()
const ttlMs = 10 * 60 * 1000
const maxAttempts = 5

const genOtp = () => String(Math.floor(100000 + Math.random() * 900000))

const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16)
  const derivedKey = await scryptAsync(password, salt, 64)
  return `scrypt$${salt.toString('base64')}$${Buffer.from(derivedKey).toString('base64')}`
}

const verifyPassword = async (password, stored) => {
  const parts = String(stored || '').split('$')
  if (parts.length !== 3) return false
  if (parts[0] !== 'scrypt') return false
  const salt = Buffer.from(parts[1], 'base64')
  const hash = Buffer.from(parts[2], 'base64')
  const derivedKey = await scryptAsync(password, salt, hash.length)
  return crypto.timingSafeEqual(hash, Buffer.from(derivedKey))
}

const signUserToken = (user) => {
  if (!env.jwtSecret) {
    const err = new Error('JWT secret not configured')
    err.status = 500
    throw err
  }
  return jwt.sign({ sub: user._id.toString(), role: 'user' }, env.jwtSecret, { expiresIn: '7d' })
}

export const signupInit = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const { email, password, fullName } = req.body
    if (!email || !password || !fullName) {
      return res.status(400).json({ ok: false, message: 'Email, password and fullName are required' })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const normalizedName = String(fullName).trim()
    const rawPassword = String(password)

    if (!normalizedEmail.includes('@')) return res.status(400).json({ ok: false, message: 'Invalid email' })
    if (rawPassword.length < 6) return res.status(400).json({ ok: false, message: 'Password must be at least 6 characters' })
    if (!normalizedName) return res.status(400).json({ ok: false, message: 'Invalid fullName' })

    const exists = await User.findOne({ email: normalizedEmail }).lean()
    if (exists) return res.status(409).json({ ok: false, message: 'Email already registered' })

    const passwordHash = await hashPassword(rawPassword)

    const code = genOtp()
    const exp = Date.now() + ttlMs
    store.set(normalizedEmail, { code, exp, attempts: 0, mode: 'signup', payload: { fullName: normalizedName, passwordHash } })
    const emailContent = userSignupOtpEmail({ otp: code, expiresInMinutes: 10 })
    await sendMail({ to: normalizedEmail, subject: emailContent.subject, text: emailContent.text, html: emailContent.html })
    res.json({ ok: true, message: 'OTP sent' })
  } catch (err) {
    next(err)
  }
}

export const signupVerify = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const { email, otp } = req.body
    if (!email || !otp) return res.status(400).json({ ok: false, message: 'Email and OTP are required' })

    const normalizedEmail = String(email).trim().toLowerCase()
    const entry = store.get(normalizedEmail)
    if (!entry || entry.mode !== 'signup') return res.status(400).json({ ok: false, message: 'OTP not requested' })
    if (entry.attempts >= maxAttempts) {
      store.delete(normalizedEmail)
      return res.status(429).json({ ok: false, message: 'Too many attempts' })
    }
    entry.attempts++
    if (Date.now() > entry.exp) {
      store.delete(normalizedEmail)
      return res.status(400).json({ ok: false, message: 'OTP expired' })
    }
    if (String(otp) !== entry.code) return res.status(400).json({ ok: false, message: 'Invalid OTP' })

    const exists = await User.findOne({ email: normalizedEmail }).lean()
    if (exists) {
      store.delete(normalizedEmail)
      return res.status(409).json({ ok: false, message: 'Email already registered' })
    }

    const user = await User.create({
      email: normalizedEmail,
      password: entry.payload.passwordHash,
      fullName: entry.payload.fullName
    })
    store.delete(normalizedEmail)

    const token = signUserToken(user)
    res.status(201).json({
      ok: true,
      token,
      data: { _id: user._id.toString(), email: user.email, fullName: user.fullName, createdAt: user.createdAt }
    })
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ ok: false, message: 'Email already registered' })
    next(err)
  }
}

export const loginInit = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ ok: false, message: 'Email and password are required' })
    const normalizedEmail = String(email).trim().toLowerCase()
    const rawPassword = String(password)
    if (!normalizedEmail.includes('@')) return res.status(400).json({ ok: false, message: 'Invalid email' })

    const user = await User.findOne({ email: normalizedEmail })
    if (!user) return res.status(401).json({ ok: false, message: 'Invalid credentials' })

    const ok = await verifyPassword(rawPassword, user.password)
    if (!ok) return res.status(401).json({ ok: false, message: 'Invalid credentials' })
    if (user.isBlocked) return res.status(403).json({ ok: false, message: 'Account blocked' })

    const code = genOtp()
    const exp = Date.now() + ttlMs
    store.set(normalizedEmail, { code, exp, attempts: 0, mode: 'login', payload: { userId: user._id.toString() } })
    const emailContent = userLoginOtpEmail({ otp: code, expiresInMinutes: 10 })
    await sendMail({ to: normalizedEmail, subject: emailContent.subject, text: emailContent.text, html: emailContent.html })
    res.json({ ok: true, message: 'OTP sent' })
  } catch (err) {
    next(err)
  }
}

export const loginVerify = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const { email, otp } = req.body
    if (!email || !otp) return res.status(400).json({ ok: false, message: 'Email and OTP are required' })
    const normalizedEmail = String(email).trim().toLowerCase()
    const entry = store.get(normalizedEmail)
    if (!entry || entry.mode !== 'login') return res.status(400).json({ ok: false, message: 'OTP not requested' })
    if (entry.attempts >= maxAttempts) {
      store.delete(normalizedEmail)
      return res.status(429).json({ ok: false, message: 'Too many attempts' })
    }
    entry.attempts++
    if (Date.now() > entry.exp) {
      store.delete(normalizedEmail)
      return res.status(400).json({ ok: false, message: 'OTP expired' })
    }
    if (String(otp) !== entry.code) return res.status(400).json({ ok: false, message: 'Invalid OTP' })

    const userId = entry.payload?.userId
    store.delete(normalizedEmail)
    if (!isId(userId)) return res.status(400).json({ ok: false, message: 'Invalid session' })

    const user = await User.findById(userId).lean()
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' })
    if (user.isBlocked) return res.status(403).json({ ok: false, message: 'Account blocked' })

    const token = signUserToken(user)
    res.json({ ok: true, token, data: { _id: user._id.toString(), email: user.email, fullName: user.fullName } })
  } catch (err) {
    next(err)
  }
}

export const logout = async (req, res) => {
  res.json({ ok: true })
}

export const me = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const userId = req.user?.id
    if (!isId(userId)) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const user = await User.findById(userId).lean()
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' })
    res.json({ ok: true, data: { _id: user._id.toString(), email: user.email, fullName: user.fullName } })
  } catch (err) {
    next(err)
  }
}

export const updatePassword = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const userId = req.user?.id
    if (!isId(userId)) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const { oldPassword, newPassword } = req.body
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ ok: false, message: 'oldPassword and newPassword are required' })
    }
    const rawOld = String(oldPassword)
    const rawNew = String(newPassword)
    if (rawNew.length < 6) return res.status(400).json({ ok: false, message: 'Password must be at least 6 characters' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' })
    const ok = await verifyPassword(rawOld, user.password)
    if (!ok) return res.status(400).json({ ok: false, message: 'Old password is incorrect' })

    user.password = await hashPassword(rawNew)
    await user.save()
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}
