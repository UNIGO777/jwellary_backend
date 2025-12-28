import mongoose from 'mongoose'
import { Product } from '../models/product.model.js'
import { Category } from '../models/category.model.js'
import { SubCategory } from '../models/subcategory.model.js'
import { isDBConnected } from '../config/db.js'

const isId = (id) => mongoose.isValidObjectId(id)
const normalizePrice = (price) => {
  const raw = typeof price === 'object' && price !== null ? price.amount : price
  const n = Number(raw)
  if (Number.isNaN(n) || n < 0) return null
  return { amount: n }
}

const ensureVariantsLean = (p) => {
  const variants = Array.isArray(p?.variants) ? p.variants : []
  if (variants.length) return p
  return { ...p, variants: [] }
}

const normalizeVariantInput = (v) => {
  const title = v?.title !== undefined ? String(v.title).trim() : 'Default'

  let makingCost
  if (v?.makingCost !== undefined) {
    makingCost = normalizePrice(v.makingCost)
    if (!makingCost) return null
  }

  let otherCharges
  if (v?.otherCharges !== undefined) {
    otherCharges = normalizePrice(v.otherCharges)
    if (!otherCharges) return null
  }

  const stockRaw = v?.stock !== undefined ? Number(v.stock) : 0
  if (Number.isNaN(stockRaw) || stockRaw < 0) return null

  const out = {
    title: title || 'Default',
    sku: v?.sku ? String(v.sku).trim() : undefined,
    stock: stockRaw,
    isActive: v?.isActive === undefined ? true : Boolean(v.isActive),
    attributes: v?.attributes
  }

  if (makingCost) out.makingCost = makingCost
  if (otherCharges) out.otherCharges = otherCharges

  if (v?.image) out.image = String(v.image).trim()
  if (Array.isArray(v?.images)) out.images = v.images.map((s) => String(s)).filter(Boolean)
  if (v?.video) out.video = String(v.video).trim()

  if (!out.sku) delete out.sku
  if (!out.image) delete out.image
  if (!out.video) delete out.video
  if (!out.images?.length) delete out.images
  if (out.attributes === undefined) delete out.attributes

  return out
}

export const index = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const page = Number(req.query.page || 1)
    const limit = Number(req.query.limit || 20)
    const q = (req.query.q || '').toString().trim().toLowerCase()
    const filter = {}
    if (q) filter.$or = [{ name: { $regex: q, $options: 'i' } }, { slug: { $regex: q, $options: 'i' } }]
    const data = (await Product.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean()).map(
      ensureVariantsLean
    )
    const total = await Product.countDocuments(filter)
    res.json({ ok: true, data, page, limit, total })
  } catch (err) {
    next(err)
  }
}

export const show = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const id = req.params.id
    if (!isId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' })
    const p = ensureVariantsLean(await Product.findById(id).lean())
    if (!p) return res.status(404).json({ ok: false, message: 'Product not found' })
    res.json({ ok: true, data: p })
  } catch (err) {
    next(err)
  }
}

export const create = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const { name, description, categoryId, subCategoryId, attributes } = req.body
    if (!name) return res.status(400).json({ ok: false, message: 'Missing name' })

    if (!Array.isArray(req.body.variants) || req.body.variants.length === 0) {
      return res.status(400).json({ ok: false, message: 'Missing variants' })
    }

    const variants = req.body.variants.map(normalizeVariantInput)
    if (variants.some((v) => !v)) return res.status(400).json({ ok: false, message: 'Invalid variants' })

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

    const doc = await Product.create({
      name: String(name).trim(),
      description: description || '',
      category: category || undefined,
      subCategory: subCategory || undefined,
      isActive: req.body.isActive === undefined ? true : Boolean(req.body.isActive),
      attributes,
      variants
    })
    res.status(201).json({ ok: true, data: doc.toObject() })
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
    if (data.description !== undefined) doc.description = data.description
    if (data.attributes !== undefined) doc.attributes = data.attributes
    if (data.isActive !== undefined) doc.isActive = Boolean(data.isActive)

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

    if (Array.isArray(data.variants)) {
      if (data.variants.length === 0) return res.status(400).json({ ok: false, message: 'Variants required' })
      const variants = data.variants.map(normalizeVariantInput)
      if (variants.some((v) => !v)) return res.status(400).json({ ok: false, message: 'Invalid variants' })
      doc.variants = variants
    }

    const saved = await doc.save()
    res.json({ ok: true, data: ensureVariantsLean(saved.toObject()) })
  } catch (err) {
    next(err)
  }
}

export const remove = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const id = req.params.id
    const ok = await Product.findByIdAndDelete(id)
    if (!ok) return res.status(404).json({ ok: false, message: 'Product not found' })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
