import { addressHtml, addressText, escapeHtml, formatInr, formatStatusLabel, orderItemsHtml, orderItemsText, wrapEmailHtml } from './common.js'

export const customerOrderConfirmedEmail = ({ order, brand = 'Om Abhusan Jwellary' } = {}) => {
  const orderId = order?._id ? String(order._id) : ''
  const customerName = order?.shippingAddress?.name ? String(order.shippingAddress.name) : 'Customer'
  const subject = `Order confirmed • ${brand}${orderId ? ` • #${orderId.slice(-8)}` : ''}`

  const subtotal = formatInr(order?.subtotal || 0)
  const discount = formatInr(order?.discount || 0)
  const total = formatInr(order?.total || 0)

  const text = `${brand}\n\nHi ${customerName},\n\nYour order has been confirmed.\n\nOrder ID: ${orderId}\n\nItems:\n${orderItemsText(order?.items || [])}\n\nSubtotal: ${subtotal}\nDiscount: ${discount}\nTotal: ${total}\n\nShipping address:\n${addressText(order?.shippingAddress)}\n\nThank you for shopping with us.`

  const contentHtml = `
    ${orderId ? `<div style="font-size:13px;color:#6b7280;margin-bottom:10px;">Order ID: <span style="color:#111827;font-weight:800;">${escapeHtml(orderId)}</span></div>` : ''}
    ${orderItemsHtml(order?.items || [])}
    <div style="margin-top:14px;border-top:1px solid #e5e7eb;padding-top:12px;">
      <div style="display:flex;justify-content:space-between;font-size:14px;color:#374151;"><span>Subtotal</span><span style="font-weight:800;color:#111827;">${escapeHtml(subtotal)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:14px;color:#374151;margin-top:6px;"><span>Discount</span><span style="font-weight:800;color:#111827;">${escapeHtml(discount)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:15px;color:#111827;margin-top:10px;"><span style="font-weight:900;">Total</span><span style="font-weight:900;">${escapeHtml(total)}</span></div>
    </div>
    <div style="margin-top:16px;padding:14px;border-radius:12px;background:#fbf7f3;border:1px solid #efe6dc;">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;font-weight:800;">Shipping address</div>
      <div style="font-size:14px;color:#111827;margin-top:6px;line-height:1.5;">${addressHtml(order?.shippingAddress)}</div>
    </div>
  `

  const html = wrapEmailHtml({
    brand,
    title: 'Order confirmed',
    subtitle: `Hi ${customerName}, your order has been confirmed.`,
    contentHtml
  })

  return { subject, text, html }
}

export const adminNewOrderEmail = ({ order, user, brand = 'Om Abhusan Jwellary' } = {}) => {
  const orderId = order?._id ? String(order._id) : ''
  const subject = `New order received • ${brand}${orderId ? ` • #${orderId.slice(-8)}` : ''}`

  const customerName =
    order?.shippingAddress?.name ||
    user?.fullName ||
    (order?.customerEmail ? String(order.customerEmail).split('@')[0] : '') ||
    'Customer'

  const customerEmail = order?.customerEmail || user?.email || ''
  const customerPhone = order?.customerPhone || order?.shippingAddress?.phone || ''

  const subtotal = formatInr(order?.subtotal || 0)
  const discount = formatInr(order?.discount || 0)
  const total = formatInr(order?.total || 0)

  const text = `${brand}\n\nNew order received.\n\nOrder ID: ${orderId}\nCustomer: ${customerName}\nEmail: ${customerEmail}\nPhone: ${customerPhone}\n\nItems:\n${orderItemsText(order?.items || [])}\n\nSubtotal: ${subtotal}\nDiscount: ${discount}\nTotal: ${total}\n\nShipping address:\n${addressText(order?.shippingAddress)}`

  const contentHtml = `
    ${orderId ? `<div style="font-size:13px;color:#6b7280;margin-bottom:12px;">Order ID: <span style="color:#111827;font-weight:800;">${escapeHtml(orderId)}</span></div>` : ''}
    <div style="padding:12px;border-radius:12px;background:#f3f4f6;border:1px solid #e5e7eb;margin:12px 0 8px;">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;font-weight:800;">Customer</div>
      <div style="font-size:14px;color:#111827;margin-top:6px;font-weight:800;">${escapeHtml(customerName)}</div>
      ${customerEmail ? `<div style="font-size:13px;color:#374151;margin-top:4px;">${escapeHtml(customerEmail)}</div>` : ''}
      ${customerPhone ? `<div style="font-size:13px;color:#374151;margin-top:2px;">${escapeHtml(customerPhone)}</div>` : ''}
    </div>
    ${orderItemsHtml(order?.items || [])}
    <div style="margin-top:14px;border-top:1px solid #e5e7eb;padding-top:12px;">
      <div style="display:flex;justify-content:space-between;font-size:14px;color:#374151;"><span>Subtotal</span><span style="font-weight:800;color:#111827;">${escapeHtml(subtotal)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:14px;color:#374151;margin-top:6px;"><span>Discount</span><span style="font-weight:800;color:#111827;">${escapeHtml(discount)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:15px;color:#111827;margin-top:10px;"><span style="font-weight:900;">Total</span><span style="font-weight:900;">${escapeHtml(total)}</span></div>
    </div>
    <div style="margin-top:16px;padding:14px;border-radius:12px;background:#fbf7f3;border:1px solid #efe6dc;">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;font-weight:800;">Shipping address</div>
      <div style="font-size:14px;color:#111827;margin-top:6px;line-height:1.5;">${addressHtml(order?.shippingAddress)}</div>
    </div>
  `

  const html = wrapEmailHtml({
    brand,
    title: 'New order received',
    subtitle: 'A new order has been placed on your store.',
    contentHtml
  })

  return { subject, text, html }
}

export const customerOrderStatusUpdatedEmail = ({ order, previousStatus, nextStatus, brand = 'Om Abhusan Jwellary' } = {}) => {
  const orderId = order?._id ? String(order._id) : ''
  const customerName = order?.shippingAddress?.name ? String(order.shippingAddress.name) : 'Customer'
  const prevLabel = formatStatusLabel(previousStatus)
  const nextLabel = formatStatusLabel(nextStatus)
  const subject = `Order update • ${brand}${orderId ? ` • #${orderId.slice(-8)}` : ''}`

  const text = `${brand}\n\nHi ${customerName},\n\nYour order status has been updated.\n\nOrder ID: ${orderId}\nPrevious status: ${prevLabel}\nCurrent status: ${nextLabel}\n\nThank you for shopping with us.`

  const contentHtml = `
    ${orderId ? `<div style="font-size:13px;color:#6b7280;margin-bottom:12px;">Order ID: <span style="color:#111827;font-weight:800;">${escapeHtml(orderId)}</span></div>` : ''}
    <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="display:flex;justify-content:space-between;gap:12px;padding:12px 14px;background:#f9fafb;">
        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;font-weight:800;">Previous</div>
        <div style="font-size:14px;color:#111827;font-weight:900;">${escapeHtml(prevLabel)}</div>
      </div>
      <div style="display:flex;justify-content:space-between;gap:12px;padding:12px 14px;background:#ffffff;border-top:1px solid #e5e7eb;">
        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;font-weight:800;">Current</div>
        <div style="font-size:14px;color:#111827;font-weight:900;">${escapeHtml(nextLabel)}</div>
      </div>
    </div>
  `

  const html = wrapEmailHtml({
    brand,
    title: 'Order status updated',
    subtitle: `Hi ${customerName}, here’s the latest update for your order.`,
    contentHtml
  })

  return { subject, text, html }
}
