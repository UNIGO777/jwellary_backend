import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { env } from '../config/env.js'

let dir = path.resolve(env.uploadDir)
try {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
} catch {
  dir = '/tmp/uploads'
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  } catch {}
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, dir)
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase()
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '-')
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, base + '-' + unique + ext)
  }
})

const fileFilter = function (req, file, cb) {
  if (file?.mimetype && String(file.mimetype).toLowerCase().startsWith('image/')) {
    cb(null, true)
    return
  }
  const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif', '.jfif']
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowed.includes(ext)) cb(null, true)
  else cb(new Error('Invalid file type'), false)
}

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }
})

const videoFileFilter = function (req, file, cb) {
  if (file?.mimetype && String(file.mimetype).toLowerCase().startsWith('video/')) {
    cb(null, true)
    return
  }
  const allowed = ['.mp4', '.webm', '.mov', '.m4v']
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowed.includes(ext)) cb(null, true)
  else cb(new Error('Invalid file type'), false)
}

export const uploadVideo = multer({
  storage,
  fileFilter: videoFileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }
})
