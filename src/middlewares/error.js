export const notFound = (req, res, next) => {
  res.status(404).json({ ok: false, message: 'Not Found' })
}

export const errorHandler = (err, req, res, next) => {
  if (err && err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ ok: false, message: 'File too large' })
    }
    return res.status(400).json({ ok: false, message: err.message || 'Upload failed' })
  }

  const status = err.status || 500
  const message = err.message || 'Internal Server Error'
  res.status(status).json({ ok: false, message })
}
