import { escapeHtml, wrapEmailHtml } from './common.js'

const baseText = ({ brand, heading, otp, expiresInMinutes }) =>
  `${brand}\n\n${heading}\n\nOTP: ${otp}\nExpires in ${expiresInMinutes} minutes.\n\nIf you did not request this, ignore this email.`

const baseHtml = ({ brand, heading, otp, expiresInMinutes }) => {
  const safeOtp = escapeHtml(otp)
  const safeMins = escapeHtml(expiresInMinutes)

  const contentHtml = `
    <div style="font-size:14px;color:#374151;margin-bottom:16px;line-height:1.5;">Use the OTP below to continue. It expires in <span style="font-weight:800;color:#111827;">${safeMins} minutes</span>.</div>
    <div style="letter-spacing:10px;font-size:26px;font-weight:900;text-align:center;padding:14px 12px;border-radius:12px;background:#fbf7f3;color:#111827;border:1px dashed #d1d5db;">${safeOtp}</div>
    <div style="font-size:12px;color:#6b7280;margin-top:16px;line-height:1.5;">If you did not request this, you can ignore this email.</div>
  `

  return wrapEmailHtml({
    brand,
    title: heading,
    subtitle: '',
    contentHtml
  })
}

export const adminOtpEmail = ({ otp, expiresInMinutes = 10, brand = 'Suman Jwellaries' }) => {
  const heading = 'Admin Login OTP'
  return {
    subject: heading,
    text: baseText({ brand, heading, otp, expiresInMinutes }),
    html: baseHtml({ brand, heading, otp, expiresInMinutes })
  }
}

export const userLoginOtpEmail = ({ otp, expiresInMinutes = 10, brand = 'Suman Jwellaries' }) => {
  const heading = 'Login OTP'
  return {
    subject: heading,
    text: baseText({ brand, heading, otp, expiresInMinutes }),
    html: baseHtml({ brand, heading, otp, expiresInMinutes })
  }
}

export const userSignupOtpEmail = ({ otp, expiresInMinutes = 10, brand = 'Suman Jwellaries' }) => {
  const heading = 'Signup OTP'
  return {
    subject: heading,
    text: baseText({ brand, heading, otp, expiresInMinutes }),
    html: baseHtml({ brand, heading, otp, expiresInMinutes })
  }
}
