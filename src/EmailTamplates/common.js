export const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

export const formatInr = (n) => {
  const value = Number(n || 0)
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
  } catch {
    const rounded = Math.round(value)
    return `₹${rounded}`
  }
}

export const formatStatusLabel = (status) => {
  const s = (status ? String(status) : '').trim().toLowerCase()
  if (!s) return 'Updated'
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export const wrapEmailHtml = ({ brand, title, subtitle, contentHtml } = {}) => {
  const safeBrand = escapeHtml(brand || '')
  const safeTitle = escapeHtml(title || '')
  const safeSubtitle = escapeHtml(subtitle || '')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle || safeBrand}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:680px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e9e9ef;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
          <div style="font-size:18px;font-weight:800;color:#111827;letter-spacing:0.2px;">${safeBrand}</div>
          <div style="height:10px;width:10px;border-radius:999px;background:#2b2118;"></div>
        </div>
        <div style="font-size:16px;font-weight:800;color:#111827;margin-bottom:8px;">${safeTitle}</div>
        ${safeSubtitle ? `<div style="font-size:14px;color:#374151;margin-bottom:14px;line-height:1.5;">${safeSubtitle}</div>` : ''}
        ${contentHtml || ''}
      </div>
      <div style="font-size:12px;color:#9ca3af;text-align:center;margin-top:16px;">© ${new Date().getFullYear()} ${safeBrand}</div>
    </div>
  </body>
</html>`
}

export const orderItemsText = (items = []) => {
  return items
    .map((it) => {
      const name = it?.name ? String(it.name) : 'Product'
      const qty = Number(it?.quantity || 0)
      const price = formatInr(it?.price || 0)
      return `- ${name} × ${qty} @ ${price}`
    })
    .join('\n')
}

export const orderItemsHtml = (items = []) => {
  const rows = items
    .map((it) => {
      const name = escapeHtml(it?.name ? String(it.name) : 'Product')
      const qty = escapeHtml(Number(it?.quantity || 0))
      const price = escapeHtml(formatInr(it?.price || 0))
      const line = Number(it?.price || 0) * Number(it?.quantity || 0)
      const lineTotal = escapeHtml(formatInr(line))
      return `<tr>
        <td style="padding:10px 0;color:#111827;font-size:14px;font-weight:600;">${name}</td>
        <td style="padding:10px 0;color:#374151;font-size:14px;text-align:center;">${qty}</td>
        <td style="padding:10px 0;color:#374151;font-size:14px;text-align:right;">${price}</td>
        <td style="padding:10px 0;color:#111827;font-size:14px;font-weight:700;text-align:right;">${lineTotal}</td>
      </tr>`
    })
    .join('')

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:8px;">
    <thead>
      <tr>
        <th align="left" style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">Item</th>
        <th align="center" style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">Qty</th>
        <th align="right" style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">Price</th>
        <th align="right" style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`
}

export const addressText = (a) => {
  if (!a) return ''
  const parts = [a?.line1, a?.line2, [a?.city, a?.state].filter(Boolean).join(', '), a?.postalCode, a?.country].filter(Boolean)
  return parts.map((p) => String(p).trim()).filter(Boolean).join('\n')
}

export const addressHtml = (a) => {
  const txt = addressText(a)
  if (!txt) return ''
  return escapeHtml(txt).replace(/\n/g, '<br/>')
}
