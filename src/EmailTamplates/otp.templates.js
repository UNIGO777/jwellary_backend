const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const baseHtml = ({ brand, heading, otp, expiresInMinutes }) => {
  const safeBrand = escapeHtml(brand)
  const safeHeading = escapeHtml(heading)
  const safeOtp = escapeHtml(otp)
  const safeMins = escapeHtml(expiresInMinutes)

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeBrand} OTP</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border-radius:12px;padding:24px;border:1px solid #e9e9ef;">
        <div style="font-size:18px;font-weight:700;color:#111827;margin-bottom:12px;">${safeBrand}</div>
        <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:8px;">${safeHeading}</div>
        <div style="font-size:14px;color:#374151;margin-bottom:16px;">Use the OTP below to continue. It expires in ${safeMins} minutes.</div>
        <div style="letter-spacing:6px;font-size:24px;font-weight:800;text-align:center;padding:14px 12px;border-radius:10px;background:#f3f4f6;color:#111827;border:1px dashed #d1d5db;">${safeOtp}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:16px;">If you did not request this, you can ignore this email.</div>
      </div>
      <div style="font-size:12px;color:#9ca3af;text-align:center;margin-top:16px;">© ${new Date().getFullYear()} ${safeBrand}</div>
    </div>
  </body>
</html>`
}

const baseText = ({ brand, heading, otp, expiresInMinutes }) =>
  `${brand}\n\n${heading}\n\nOTP: ${otp}\nExpires in ${expiresInMinutes} minutes.\n\nIf you did not request this, ignore this email.`

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
