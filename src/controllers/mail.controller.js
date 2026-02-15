import { sendMail } from '../config/mailer.js'
import { env } from '../config/env.js'

export const sendBasic = async (req, res, next) => {
  try {
    const { to, subject, text, html } = req.body
    if (!subject || (!text && !html)) return res.status(400).json({ ok: false, message: 'Missing subject or content' })
    const info = await sendMail({ to, subject, text, html })
    res.json({ ok: true, id: info.messageId })
  } catch (err) {
    next(err)
  }
}

export const contact = async (req, res, next) => {
  try {
    const { name, email, phone, message, orderId, type } = req.body
    if (!name || !email || !message) return res.status(400).json({ ok: false, message: 'Missing fields' })
    const isOrder = String(type || '').toLowerCase() === 'order' || Boolean(orderId)
    if (isOrder && !orderId) return res.status(400).json({ ok: false, message: 'Missing orderId' })

    const safeName = String(name).trim()
    const safeEmail = String(email).trim()
    const safePhone = phone ? String(phone).trim() : ''
    const safeOrderId = orderId ? String(orderId).trim() : ''

    const subject = isOrder ? `Order query • ${safeOrderId}` : `Contact from ${safeName}`
    const lines = [
      `From: ${safeName} <${safeEmail}>`,
      safePhone ? `Phone: ${safePhone}` : '',
      isOrder ? `Order ID: ${safeOrderId}` : '',
      '',
      String(message)
    ].filter(Boolean)
    const text = lines.join('\n')

    const to = (env.admin.email || env.mail.to || env.mail.from || '').trim()
    const info = await sendMail({ to, subject, text })
    res.json({ ok: true, id: info.messageId })
  } catch (err) {
    next(err)
  }
}
