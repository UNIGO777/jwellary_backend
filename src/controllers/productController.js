import mongoose from 'mongoose'
import fs from 'fs/promises'
import path from 'path'
import { Product } from '../models/product.model.js'
import { Category } from '../models/category.model.js'
import { SubCategory } from '../models/subcategory.model.js'
import { GoldRate } from '../models/goldRate.model.js'
import { SilverRate } from '../models/silverRate.model.js'
import { DiamondPrice } from '../models/diamondPrice.model.js'
import { DiamondType } from '../models/diamondType.model.js'
import { User } from '../models/user.model.js'
import { isDBConnected } from '../config/db.js'
import { env } from '../config/env.js'

const isId = (id) => mongoose.isValidObjectId(id)
const normalizePrice = (price) => {
  const raw = typeof price === 'object' && price !== null ? price.amount : price
  const n = Number(raw)
  if (Number.isNaN(n) || n < 0) return null
  return { amount: n }
}

const normalizeImages = (value) => {
  if (!Array.isArray(value)) return undefined
  const list = value.map((s) => String(s)).filter(Boolean)
  return list.length ? list : undefined
}

const normalizeMaterial = (value) => {
  if (value === undefined || value === null || value === '') return undefined
  const v = String(value).trim().toLowerCase()
  if (!v) return undefined
  if (!['gold', 'silver', 'diamond'].includes(v)) return null
  return v
}

const normalizeSizes = (value) => {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  const list = raw.map((s) => String(s).trim()).filter(Boolean)
  const unique = Array.from(new Set(list))
  return unique.length ? unique.slice(0, 50) : undefined
}

const diamondTypeLabel = (t) => {
  const parts = [t?.origin, t?.shape, t?.cut, t?.color, t?.clarity].filter(Boolean).map(String)
  return parts.join(' / ')
}

const asPlainObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value
}

const formatCompactNumber = (value) => {
  const n = Number(value)
  if (Number.isNaN(n)) return String(value ?? '')
  if (Number.isInteger(n)) return String(n)
  return String(Number(n.toFixed(6)))
}

const uploadRootDir = path.resolve(env.uploadDir)

const getUploadsAbsolutePath = (value) => {
  const raw = value === undefined || value === null ? '' : String(value).trim()
  if (!raw) return null

  let pathname = raw
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      pathname = new URL(raw).pathname || raw
    } catch {
      pathname = raw
    }
  }

  const needle = '/uploads/'
  const idx = pathname.lastIndexOf(needle)
  if (idx === -1) return null

  const rest = pathname.slice(idx + needle.length).split('?')[0].split('#')[0].replace(/^\/+/, '')
  if (!rest || rest.includes('..') || path.isAbsolute(rest)) return null

  const abs = path.resolve(uploadRootDir, rest)
  const prefix = uploadRootDir.endsWith(path.sep) ? uploadRootDir : uploadRootDir + path.sep
  if (!abs.startsWith(prefix)) return null
  return abs
}

const unlinkIfExists = async (filePath) => {
  if (!filePath) return
  try {
    await fs.unlink(filePath)
  } catch {}
}

const sanitizeHtml = (value) => {
  const input = value === undefined || value === null ? '' : String(value)
  if (!input) return ''
  let out = input
  out = out.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  out = out.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  out = out.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
  out = out.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
  out = out.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
  out = out.replace(/<link\b[^>]*>/gi, '')
  out = out.replace(/<meta\b[^>]*>/gi, '')
  out = out.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
  out = out.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
  out = out.replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '')
  out = out.replace(/\s(href|src)\s*=\s*javascript:[^\s>]+/gi, '')
  return out.trim()
}

const computeReviewStats = (reviews) => {
  const list = Array.isArray(reviews) ? reviews : []
  const count = list.length
  if (!count) return { rating: 0, reviewsCount: 0 }
  const sum = list.reduce((acc, r) => acc + (Number(r?.rating) || 0), 0)
  const avg = sum / count
  const rating = Math.round(avg * 10) / 10
  return { rating, reviewsCount: count }
}

const computeAskingPriceInr = (p) => {
  const making = Number(p?.makingCost?.amount) || 0
  const other = Number(p?.otherCharges?.amount) || 0
  const total = making + other
  return Number.isFinite(total) && total >= 0 ? total : 0
}

const computeMaterialPricing = ({ product, goldByCarat, silverByPurityMark, diamondByTypeId }) => {
  const attrs = asPlainObject(product?.attributes)
  const weight = Number(attrs?.weightGrams)
  const weightValue = Number.isFinite(weight) && weight > 0 ? weight : 0
  const material = product?.material ? String(product.material).toLowerCase() : ''
  const materialType = product?.materialType

  if (material === 'gold') {
    const carat = Number(materialType)
    const rate = Number(goldByCarat?.get(carat)?.ratePer10Gram)
    if (!Number.isFinite(rate) || rate <= 0 || !weightValue) return { valueInr: 0 }
    return { valueInr: (rate / 10) * weightValue, ratePer10Gram: rate, weightGrams: weightValue, carat }
  }

  if (material === 'silver') {
    const purityMark = Number(materialType)
    const rate = Number(silverByPurityMark?.get(purityMark)?.ratePerKg)
    if (!Number.isFinite(rate) || rate <= 0 || !weightValue) return { valueInr: 0 }
    return { valueInr: (rate / 1000) * weightValue, ratePerKg: rate, weightGrams: weightValue, purityMark }
  }

  if (material === 'diamond') {
    const typeId = materialType ? String(materialType) : ''
    if (!typeId) return { valueInr: 0 }
    const rate = Number(diamondByTypeId?.get(typeId)?.pricePerCarat)
    if (!Number.isFinite(rate) || rate <= 0) return { valueInr: 0 }
    const carat = Number(attrs?.diamondCarat ?? attrs?.carat ?? attrs?.carats ?? attrs?.weightCarat ?? attrs?.weightCarats)
    const caratValue = Number.isFinite(carat) && carat > 0 ? carat : 0
    if (!caratValue) return { valueInr: 0 }
    return { valueInr: rate * caratValue, pricePerCarat: rate, diamondCarat: caratValue, diamondType: typeId }
  }

  return { valueInr: 0 }
}

const applyDynamicPricing = ({ product, goldByCarat, silverByPurityMark, diamondByTypeId }) => {
  const askingPriceInr = computeAskingPriceInr(product)
  const material = product?.material ? String(product.material).toLowerCase() : ''
  const materialPricing = computeMaterialPricing({ product, goldByCarat, silverByPurityMark, diamondByTypeId })
  const materialValueInr = Number(materialPricing?.valueInr) || 0
  const total = askingPriceInr + materialValueInr
  const attrs = { ...asPlainObject(product?.attributes) }
  attrs.askingPriceInr = Math.round(askingPriceInr)
  attrs.materialValueInr = Math.round(materialValueInr)
  if (material === 'gold' && Number.isFinite(materialPricing?.ratePer10Gram)) attrs.materialRatePer10Gram = Math.round(Number(materialPricing.ratePer10Gram))
  if (material === 'silver' && Number.isFinite(materialPricing?.ratePerKg)) attrs.materialRatePerKg = Math.round(Number(materialPricing.ratePerKg))
  if (material === 'diamond' && Number.isFinite(materialPricing?.pricePerCarat)) attrs.materialPricePerCarat = Math.round(Number(materialPricing.pricePerCarat))
  attrs.priceInr = Math.round(total)
  product.attributes = attrs
  product.priceInr = attrs.priceInr
  return product
}

const buildRateMapsForProduct = async (p) => {
  const material = p?.material ? String(p.material).toLowerCase() : ''
  const goldByCarat = new Map()
  const silverByPurityMark = new Map()
  const diamondByTypeId = new Map()

  if (material === 'gold') {
    const carat = Number(p?.materialType)
    if (Number.isFinite(carat)) {
      const rate = await GoldRate.findOne({ carat, ratePer10Gram: { $gt: 0 } }).sort({ date: -1, createdAt: -1 }).lean()
      if (rate) goldByCarat.set(carat, { ratePer10Gram: rate?.ratePer10Gram })
    }
  } else if (material === 'silver') {
    const purityMark = Number(p?.materialType)
    if (Number.isFinite(purityMark)) {
      const rate = await SilverRate.findOne({ purityMark, ratePerKg: { $gt: 0 } }).sort({ date: -1, createdAt: -1 }).lean()
      if (rate) silverByPurityMark.set(purityMark, { ratePerKg: rate?.ratePerKg })
    }
  } else if (material === 'diamond') {
    const typeId = p?.materialType ? String(p.materialType) : ''
    if (typeId && isId(typeId)) {
      const rate = await DiamondPrice.findOne({ diamondType: typeId, pricePerCarat: { $gt: 0 } }).sort({ date: -1, createdAt: -1 }).lean()
      if (rate) diamondByTypeId.set(typeId, { pricePerCarat: rate?.pricePerCarat })
    }
  }

  return { goldByCarat, silverByPurityMark, diamondByTypeId }
}

export const index = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const page = Number(req.query.page || 1)
    const requestedLimit = Number(req.query.limit || 20)
    const limit = Math.min(Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 20, 30)
    const q = (req.query.q || '').toString().trim().toLowerCase()
    const isActive = req.query.isActive
    const categoryId = req.query.categoryId
    const subCategoryId = req.query.subCategoryId
    const featured = req.query.featured ?? req.query.isFeatured
    const bestSeller = req.query.bestSeller ?? req.query.isBestSeller
    const filter = {}
    if (q) filter.$or = [{ name: { $regex: q, $options: 'i' } }, { slug: { $regex: q, $options: 'i' } }]
    if (isActive !== undefined) filter.isActive = isActive === 'true'
    if (featured !== undefined) filter.isFeatured = String(featured) === 'true'
    if (bestSeller !== undefined) filter.isBestSeller = String(bestSeller) === 'true'

    if (categoryId !== undefined) {
      const cId = String(categoryId || '')
      if (!cId || !isId(cId)) return res.status(400).json({ ok: false, message: 'Invalid categoryId' })
      filter.category = cId
    }

    if (subCategoryId !== undefined) {
      const scId = String(subCategoryId || '')
      if (!scId || !isId(scId)) return res.status(400).json({ ok: false, message: 'Invalid subCategoryId' })
      filter.subCategory = scId

      if (filter.category) {
        const sc = await SubCategory.findById(scId).select({ category: 1 }).lean()
        if (!sc) return res.status(404).json({ ok: false, message: 'SubCategory not found' })
        if (sc.category?.toString() !== filter.category?.toString()) {
          return res.status(400).json({ ok: false, message: 'SubCategory does not belong to Category' })
        }
      }
    }
    const data = await Product.find(filter).select('-variants -reviews').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean()
    const total = await Product.countDocuments(filter)

    const goldCarats = Array.from(
      new Set(
        (data || [])
          .filter((p) => String(p?.material || '').toLowerCase() === 'gold')
          .map((p) => Number(p?.materialType))
          .filter((n) => Number.isFinite(n))
      )
    )
    const silverMarks = Array.from(
      new Set(
        (data || [])
          .filter((p) => String(p?.material || '').toLowerCase() === 'silver')
          .map((p) => Number(p?.materialType))
          .filter((n) => Number.isFinite(n))
      )
    )
    const diamondTypeIds = Array.from(
      new Set(
        (data || [])
          .filter((p) => String(p?.material || '').toLowerCase() === 'diamond')
          .map((p) => (p?.materialType ? String(p.materialType) : ''))
          .filter(Boolean)
      )
    )
    const diamondIdsForQuery = diamondTypeIds.filter((id) => isId(id)).map((id) => new mongoose.Types.ObjectId(id))

    const [goldLatest, silverLatest, diamondLatest] = await Promise.all([
      goldCarats.length
        ? GoldRate.aggregate([
            { $match: { carat: { $in: goldCarats }, ratePer10Gram: { $gt: 0 } } },
            { $sort: { date: -1, createdAt: -1, _id: -1 } },
            { $group: { _id: '$carat', carat: { $first: '$carat' }, ratePer10Gram: { $first: '$ratePer10Gram' } } },
            { $project: { _id: 0, carat: 1, ratePer10Gram: 1 } }
          ])
        : [],
      silverMarks.length
        ? SilverRate.aggregate([
            { $match: { purityMark: { $in: silverMarks }, ratePerKg: { $gt: 0 } } },
            { $sort: { date: -1, createdAt: -1, _id: -1 } },
            { $group: { _id: '$purityMark', purityMark: { $first: '$purityMark' }, ratePerKg: { $first: '$ratePerKg' } } },
            { $project: { _id: 0, purityMark: 1, ratePerKg: 1 } }
          ])
        : [],
      diamondIdsForQuery.length
        ? DiamondPrice.aggregate([
            { $match: { diamondType: { $in: diamondIdsForQuery }, pricePerCarat: { $gt: 0 } } },
            { $sort: { date: -1, createdAt: -1, _id: -1 } },
            { $group: { _id: '$diamondType', diamondType: { $first: '$diamondType' }, pricePerCarat: { $first: '$pricePerCarat' } } },
            { $project: { _id: 0, diamondType: 1, pricePerCarat: 1 } }
          ])
        : []
    ])

    const goldByCarat = new Map((goldLatest || []).map((g) => [Number(g?.carat), { ratePer10Gram: g?.ratePer10Gram }]))
    const silverByPurityMark = new Map((silverLatest || []).map((s) => [Number(s?.purityMark), { ratePerKg: s?.ratePerKg }]))
    const diamondByTypeId = new Map((diamondLatest || []).map((d) => [d?.diamondType ? String(d.diamondType) : '', { pricePerCarat: d?.pricePerCarat }]))

    const priced = (data || []).map((p) => applyDynamicPricing({ product: p, goldByCarat, silverByPurityMark, diamondByTypeId }))
    res.json({ ok: true, data: priced, page, limit, total })
  } catch (err) {
    next(err)
  }
}

export const show = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const id = req.params.id
    if (!isId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' })
    const p = await Product.findById(id).select('-variants -reviews').lean()
    if (!p) return res.status(404).json({ ok: false, message: 'Product not found' })
    const { goldByCarat, silverByPurityMark, diamondByTypeId } = await buildRateMapsForProduct(p)
    const priced = applyDynamicPricing({ product: p, goldByCarat, silverByPurityMark, diamondByTypeId })
    res.json({ ok: true, data: priced })
  } catch (err) {
    next(err)
  }
}

export const reviewsIndex = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const id = req.params.id
    if (!isId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' })
    const p = await Product.findById(id).select({ reviews: 1 }).lean()
    if (!p) return res.status(404).json({ ok: false, message: 'Product not found' })
    const list = Array.isArray(p.reviews) ? p.reviews : []
    const data = list
      .slice()
      .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
      .map((r) => ({
        id: r?._id,
        name: r?.name || 'User',
        rating: Number(r?.rating) || 0,
        comment: r?.comment || '',
        createdAt: r?.createdAt,
        updatedAt: r?.updatedAt
      }))
    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
}

export const reviewsUpsert = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const id = req.params.id
    if (!isId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' })
    const userId = req.user?.id
    if (!userId || !isId(userId)) return res.status(401).json({ ok: false, message: 'Unauthorized' })

    const ratingRaw = Number(req.body?.rating)
    if (!Number.isFinite(ratingRaw) || ratingRaw < 1 || ratingRaw > 5) return res.status(400).json({ ok: false, message: 'Invalid rating' })
    const rating = Math.round(ratingRaw * 10) / 10
    const comment = req.body?.comment !== undefined && req.body?.comment !== null ? String(req.body.comment).trim() : ''

    const user = await User.findById(userId).select({ fullName: 1 }).lean()
    if (!user) return res.status(401).json({ ok: false, message: 'Unauthorized' })

    const doc = await Product.findById(id)
    if (!doc) return res.status(404).json({ ok: false, message: 'Product not found' })

    const name = user?.fullName ? String(user.fullName).trim() : 'User'
    const list = Array.isArray(doc.reviews) ? doc.reviews : []
    const existing = list.find((r) => String(r?.user) === String(userId))

    if (existing) {
      existing.name = name
      existing.rating = rating
      existing.comment = comment
      existing.updatedAt = new Date()
    } else {
      doc.reviews.push({ user: userId, name, rating, comment })
    }

    const stats = computeReviewStats(doc.reviews)
    const attrs = typeof doc.attributes === 'object' && doc.attributes !== null && !Array.isArray(doc.attributes) ? { ...doc.attributes } : {}
    attrs.rating = stats.rating
    attrs.reviewsCount = stats.reviewsCount
    doc.attributes = attrs

    await doc.save()

    res.status(existing ? 200 : 201).json({ ok: true, data: { rating: stats.rating, reviewsCount: stats.reviewsCount } })
  } catch (err) {
    next(err)
  }
}

export const create = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const { name, description, categoryId, subCategoryId, attributes, isFeatured, isBestSeller } = req.body
    if (!name) return res.status(400).json({ ok: false, message: 'Missing name' })

    let category = categoryId
    let subCategory = subCategoryId
    if (category) {
      if (!isId(category)) return res.status(400).json({ ok: false, message: 'Invalid categoryId' })
      const exists = await Category.findById(category).lean()
      if (!exists) return res.status(404).json({ ok: false, message: 'Category not found' })
    }
    if (subCategory) {
      if (!isId(subCategory)) return res.status(400).json({ ok: false, message: 'Invalid subCategoryId' })
      const sc = await SubCategory.findById(subCategory).lean()
      if (!sc) return res.status(404).json({ ok: false, message: 'SubCategory not found' })
      if (category && sc.category.toString() !== category.toString()) {
        return res.status(400).json({ ok: false, message: 'SubCategory does not belong to Category' })
      }
      if (!category) category = sc.category.toString()
    }

    const makingCost = req.body.makingCost !== undefined ? normalizePrice(req.body.makingCost) : undefined
    if (req.body.makingCost !== undefined && !makingCost) return res.status(400).json({ ok: false, message: 'Invalid makingCost' })

    const otherCharges = req.body.otherCharges !== undefined ? normalizePrice(req.body.otherCharges) : undefined
    if (req.body.otherCharges !== undefined && !otherCharges) return res.status(400).json({ ok: false, message: 'Invalid otherCharges' })

    const stockRaw = req.body.stock !== undefined ? Number(req.body.stock) : 0
    if (Number.isNaN(stockRaw) || stockRaw < 0) return res.status(400).json({ ok: false, message: 'Invalid stock' })

    const material = normalizeMaterial(req.body.material)
    if (material === null) return res.status(400).json({ ok: false, message: 'Invalid material' })

    let materialType
    let resolvedPurity
    if (material === 'gold') {
      const n = Number(req.body.materialType)
      if (Number.isNaN(n)) return res.status(400).json({ ok: false, message: 'Invalid materialType' })
      const allowed = await GoldRate.distinct('carat')
      if (Array.isArray(allowed) && allowed.length && !allowed.includes(n)) {
        return res.status(400).json({ ok: false, message: 'Invalid gold type' })
      }
      materialType = n
      const rate = await GoldRate.findOne({ carat: n }).sort({ date: -1, createdAt: -1 }).lean()
      if (rate) resolvedPurity = rate.purity
    } else if (material === 'silver') {
      const n = Number(req.body.materialType)
      if (Number.isNaN(n)) return res.status(400).json({ ok: false, message: 'Invalid materialType' })
      const allowed = await SilverRate.distinct('purityMark')
      if (Array.isArray(allowed) && allowed.length && !allowed.includes(n)) {
        return res.status(400).json({ ok: false, message: 'Invalid silver type' })
      }
      materialType = n
      const rate = await SilverRate.findOne({ purityMark: n }).sort({ date: -1, createdAt: -1 }).lean()
      if (rate) resolvedPurity = rate.purityPercent
    } else if (material === 'diamond') {
      const raw = req.body.materialType
      if (!raw || !isId(raw)) return res.status(400).json({ ok: false, message: 'Invalid materialType' })
      const allowed = await DiamondPrice.distinct('diamondType')
      const idStr = String(raw)
      if (Array.isArray(allowed) && allowed.length && !allowed.map(String).includes(idStr)) {
        return res.status(400).json({ ok: false, message: 'Invalid diamond type' })
      }
      materialType = idStr
    }

    const normalizedAttributes = { ...asPlainObject(attributes) }
    if (material === 'gold' || material === 'silver') {
      if (resolvedPurity !== undefined && resolvedPurity !== null) normalizedAttributes.purity = String(resolvedPurity)
    } else {
      if (normalizedAttributes.purity !== undefined) delete normalizedAttributes.purity
    }

    const hasSizes = req.body.hasSizes === undefined ? false : Boolean(req.body.hasSizes)
    const sizes = hasSizes ? normalizeSizes(req.body.sizes) : undefined
    if (hasSizes && !sizes) return res.status(400).json({ ok: false, message: 'Sizes required' })

    const doc = await Product.create({
      name: String(name).trim(),
      description: sanitizeHtml(description),
      sku: req.body.sku ? String(req.body.sku).trim() : undefined,
      images: normalizeImages(req.body.images),
      image: req.body.image ? String(req.body.image).trim() : undefined,
      video: req.body.video ? String(req.body.video).trim() : undefined,
      makingCost: makingCost || undefined,
      otherCharges: otherCharges || undefined,
      stock: stockRaw,
      material: material || undefined,
      materialType: materialType === undefined ? undefined : materialType,
      hasSizes,
      sizes,
      category: category || undefined,
      subCategory: subCategory || undefined,
      isFeatured: Boolean(isFeatured),
      isBestSeller: Boolean(isBestSeller),
      isActive: req.body.isActive === undefined ? true : Boolean(req.body.isActive),
      attributes: Object.keys(normalizedAttributes).length ? normalizedAttributes : undefined
    })
    const out = doc.toObject()
    const { goldByCarat, silverByPurityMark, diamondByTypeId } = await buildRateMapsForProduct(out)
    const priced = applyDynamicPricing({ product: out, goldByCarat, silverByPurityMark, diamondByTypeId })
    res.status(201).json({ ok: true, data: priced })
  } catch (err) {
    next(err)
  }
}

export const updateOne = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const id = req.params.id
    if (!isId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' })
    const doc = await Product.findById(id)
    if (!doc) return res.status(404).json({ ok: false, message: 'Product not found' })

    const data = { ...req.body }
    if (data.name !== undefined) doc.name = data.name
    if (data.description !== undefined) doc.description = sanitizeHtml(data.description)
    if (data.attributes !== undefined) doc.attributes = data.attributes
    if (data.isActive !== undefined) doc.isActive = Boolean(data.isActive)
    if (data.isFeatured !== undefined) doc.isFeatured = Boolean(data.isFeatured)
    if (data.isBestSeller !== undefined) doc.isBestSeller = Boolean(data.isBestSeller)
    if (data.sku !== undefined) doc.sku = data.sku ? String(data.sku).trim() : undefined
    if (data.images !== undefined) doc.images = normalizeImages(data.images)
    if (data.image !== undefined) doc.image = data.image ? String(data.image).trim() : undefined
    if (data.video !== undefined) doc.video = data.video ? String(data.video).trim() : undefined

    if (data.makingCost !== undefined) {
      const n = normalizePrice(data.makingCost)
      if (!n) return res.status(400).json({ ok: false, message: 'Invalid makingCost' })
      doc.makingCost = n
    }
    if (data.otherCharges !== undefined) {
      const n = normalizePrice(data.otherCharges)
      if (!n) return res.status(400).json({ ok: false, message: 'Invalid otherCharges' })
      doc.otherCharges = n
    }
    if (data.stock !== undefined) {
      const n = Number(data.stock)
      if (Number.isNaN(n) || n < 0) return res.status(400).json({ ok: false, message: 'Invalid stock' })
      doc.stock = n
    }

    if (data.hasSizes !== undefined) {
      doc.hasSizes = Boolean(data.hasSizes)
      if (!doc.hasSizes) doc.sizes = undefined
    }
    if (data.sizes !== undefined) {
      const sizes = normalizeSizes(data.sizes)
      if (!sizes) {
        doc.sizes = undefined
        doc.hasSizes = false
      } else {
        doc.sizes = sizes
        doc.hasSizes = true
      }
    }

    if (data.material !== undefined) {
      const material = normalizeMaterial(data.material)
      if (material === null) return res.status(400).json({ ok: false, message: 'Invalid material' })
      doc.material = material || undefined

      if (!material) {
        doc.materialType = undefined
      } else if (data.materialType !== undefined) {
        let materialType
        if (material === 'gold') {
          const n = Number(data.materialType)
          if (Number.isNaN(n)) return res.status(400).json({ ok: false, message: 'Invalid materialType' })
          const allowed = await GoldRate.distinct('carat')
          if (Array.isArray(allowed) && allowed.length && !allowed.includes(n)) {
            return res.status(400).json({ ok: false, message: 'Invalid gold type' })
          }
          materialType = n
        } else if (material === 'silver') {
          const n = Number(data.materialType)
          if (Number.isNaN(n)) return res.status(400).json({ ok: false, message: 'Invalid materialType' })
          const allowed = await SilverRate.distinct('purityMark')
          if (Array.isArray(allowed) && allowed.length && !allowed.includes(n)) {
            return res.status(400).json({ ok: false, message: 'Invalid silver type' })
          }
          materialType = n
        } else if (material === 'diamond') {
          const raw = data.materialType
          if (!raw || !isId(raw)) return res.status(400).json({ ok: false, message: 'Invalid materialType' })
          const allowed = await DiamondPrice.distinct('diamondType')
          const idStr = String(raw)
          if (Array.isArray(allowed) && allowed.length && !allowed.map(String).includes(idStr)) {
            return res.status(400).json({ ok: false, message: 'Invalid diamond type' })
          }
          materialType = idStr
        }
        doc.materialType = materialType === undefined ? undefined : materialType
      }
    } else if (data.materialType !== undefined) {
      const material = doc.material
      if (!material) return res.status(400).json({ ok: false, message: 'Material required for materialType' })
      let materialType
      if (material === 'gold') {
        const n = Number(data.materialType)
        if (Number.isNaN(n)) return res.status(400).json({ ok: false, message: 'Invalid materialType' })
        const allowed = await GoldRate.distinct('carat')
        if (Array.isArray(allowed) && allowed.length && !allowed.includes(n)) {
          return res.status(400).json({ ok: false, message: 'Invalid gold type' })
        }
        materialType = n
      } else if (material === 'silver') {
        const n = Number(data.materialType)
        if (Number.isNaN(n)) return res.status(400).json({ ok: false, message: 'Invalid materialType' })
        const allowed = await SilverRate.distinct('purityMark')
        if (Array.isArray(allowed) && allowed.length && !allowed.includes(n)) {
          return res.status(400).json({ ok: false, message: 'Invalid silver type' })
        }
        materialType = n
      } else if (material === 'diamond') {
        const raw = data.materialType
        if (!raw || !isId(raw)) return res.status(400).json({ ok: false, message: 'Invalid materialType' })
        const allowed = await DiamondPrice.distinct('diamondType')
        const idStr = String(raw)
        if (Array.isArray(allowed) && allowed.length && !allowed.map(String).includes(idStr)) {
          return res.status(400).json({ ok: false, message: 'Invalid diamond type' })
        }
        materialType = idStr
      }
      doc.materialType = materialType === undefined ? undefined : materialType
    }

    const finalMaterial = doc.material
    const finalMaterialType = doc.materialType
    if (finalMaterial === 'gold' && finalMaterialType !== undefined && finalMaterialType !== null) {
      const rate = await GoldRate.findOne({ carat: Number(finalMaterialType) }).sort({ date: -1, createdAt: -1 }).lean()
      if (rate) {
        const attrs = { ...asPlainObject(doc.attributes) }
        attrs.purity = String(rate.purity)
        doc.attributes = attrs
      }
    } else if (finalMaterial === 'silver' && finalMaterialType !== undefined && finalMaterialType !== null) {
      const rate = await SilverRate.findOne({ purityMark: Number(finalMaterialType) }).sort({ date: -1, createdAt: -1 }).lean()
      if (rate) {
        const attrs = { ...asPlainObject(doc.attributes) }
        attrs.purity = String(rate.purityPercent)
        doc.attributes = attrs
      }
    } else {
      const attrs = { ...asPlainObject(doc.attributes) }
      if (attrs.purity !== undefined) delete attrs.purity
      doc.attributes = Object.keys(attrs).length ? attrs : undefined
    }

    if (data.categoryId) {
      const cId = data.categoryId
      if (!isId(cId)) return res.status(400).json({ ok: false, message: 'Invalid categoryId' })
      const exists = await Category.findById(cId).lean()
      if (!exists) return res.status(404).json({ ok: false, message: 'Category not found' })
      doc.category = cId
    }
    if (data.subCategoryId) {
      const scId = data.subCategoryId
      if (!isId(scId)) return res.status(400).json({ ok: false, message: 'Invalid subCategoryId' })
      const sc = await SubCategory.findById(scId).lean()
      if (!sc) return res.status(404).json({ ok: false, message: 'SubCategory not found' })
      if (doc.category && sc.category.toString() !== doc.category.toString()) {
        return res.status(400).json({ ok: false, message: 'SubCategory does not belong to Category' })
      }
      doc.subCategory = scId
    }

    const saved = await doc.save()
    const out = saved.toObject()
    const { goldByCarat, silverByPurityMark, diamondByTypeId } = await buildRateMapsForProduct(out)
    const priced = applyDynamicPricing({ product: out, goldByCarat, silverByPurityMark, diamondByTypeId })
    res.json({ ok: true, data: priced })
  } catch (err) {
    next(err)
  }
}

export const remove = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const id = req.params.id
    if (!isId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' })
    const doc = await Product.findById(id)
    if (!doc) return res.status(404).json({ ok: false, message: 'Product not found' })

    const media = []
    if (doc.image) media.push(doc.image)
    if (doc.video) media.push(doc.video)
    if (Array.isArray(doc.images)) media.push(...doc.images)

    const absPaths = Array.from(
      new Set(
        media
          .map(getUploadsAbsolutePath)
          .filter(Boolean)
          .map(String)
      )
    )

    await Promise.all(absPaths.map(unlinkIfExists))
    await doc.deleteOne()
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

export const materialTypes = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })

    const [goldLatest, silverLatest, diamondLatest] = await Promise.all([
      GoldRate.aggregate([
        { $match: { ratePer10Gram: { $gt: 0 } } },
        { $sort: { date: -1, createdAt: -1, _id: -1 } },
        { $group: { _id: '$carat', carat: { $first: '$carat' }, purity: { $first: '$purity' }, price: { $first: '$ratePer10Gram' } } },
        { $project: { _id: 0, carat: 1, purity: 1, price: 1 } },
        { $sort: { carat: -1 } }
      ]),
      SilverRate.aggregate([
        { $match: { ratePerKg: { $gt: 0 } } },
        { $sort: { date: -1, createdAt: -1, _id: -1 } },
        { $group: { _id: '$purityMark', purityMark: { $first: '$purityMark' }, purity: { $first: '$purityPercent' }, price: { $first: '$ratePerKg' } } },
        { $project: { _id: 0, purityMark: 1, purity: 1, price: 1 } },
        { $sort: { purityMark: -1 } }
      ]),
      DiamondPrice.aggregate([
        { $match: { pricePerCarat: { $gt: 0 } } },
        { $sort: { date: -1, createdAt: -1, _id: -1 } },
        { $group: { _id: '$diamondType', diamondType: { $first: '$diamondType' }, price: { $first: '$pricePerCarat' } } },
        { $project: { _id: 0, diamondType: 1, price: 1 } }
      ])
    ])

    const diamondTypeIds = (diamondLatest || []).map((d) => d?.diamondType).filter(Boolean)
    const diamondTypes = diamondTypeIds.length ? await DiamondType.find({ _id: { $in: diamondTypeIds } }).lean() : []
    const diamondTypeById = new Map((diamondTypes || []).map((t) => [String(t._id), t]))

    res.json({
      ok: true,
      data: {
        gold: (goldLatest || [])
          .map((g) => {
            const carat = Number(g?.carat)
            if (Number.isNaN(carat)) return null
            const purity = g?.purity
            const price = g?.price
            return {
              value: carat,
              label: `${carat}k (${formatCompactNumber(purity)})(${formatCompactNumber(price)})`,
              purity,
              price
            }
          })
          .filter(Boolean),
        silver: (silverLatest || [])
          .map((s) => {
            const purityMark = Number(s?.purityMark)
            if (Number.isNaN(purityMark)) return null
            const purity = s?.purity
            const price = s?.price
            return {
              value: purityMark,
              label: `${purityMark} (${formatCompactNumber(purity)})(${formatCompactNumber(price)})`,
              purity,
              price
            }
          })
          .filter(Boolean),
        diamond: (diamondLatest || [])
          .map((d) => {
            const id = d?.diamondType ? String(d.diamondType) : ''
            if (!id) return null
            const t = diamondTypeById.get(id)
            const base = t ? diamondTypeLabel(t) : id
            const price = d?.price
            return { value: id, label: `${base} (${formatCompactNumber(price)})`, price }
          })
          .filter(Boolean)
      }
    })
  } catch (err) {
    next(err)
  }
}
