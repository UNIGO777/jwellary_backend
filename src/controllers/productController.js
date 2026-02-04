import mongoose from 'mongoose'
import { Product } from '../models/product.model.js'
import { Category } from '../models/category.model.js'
import { SubCategory } from '../models/subcategory.model.js'
import { GoldRate } from '../models/goldRate.model.js'
import { SilverRate } from '../models/silverRate.model.js'
import { DiamondPrice } from '../models/diamondPrice.model.js'
import { DiamondType } from '../models/diamondType.model.js'
import { isDBConnected } from '../config/db.js'

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

export const index = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const page = Number(req.query.page || 1)
    const limit = Number(req.query.limit || 20)
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
    const data = await Product.find(filter).select('-variants').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean()
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
    const p = await Product.findById(id).select('-variants').lean()
    if (!p) return res.status(404).json({ ok: false, message: 'Product not found' })
    res.json({ ok: true, data: p })
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

    const doc = await Product.create({
      name: String(name).trim(),
      description: description || '',
      sku: req.body.sku ? String(req.body.sku).trim() : undefined,
      images: normalizeImages(req.body.images),
      image: req.body.image ? String(req.body.image).trim() : undefined,
      video: req.body.video ? String(req.body.video).trim() : undefined,
      makingCost: makingCost || undefined,
      otherCharges: otherCharges || undefined,
      stock: stockRaw,
      material: material || undefined,
      materialType: materialType === undefined ? undefined : materialType,
      category: category || undefined,
      subCategory: subCategory || undefined,
      isFeatured: Boolean(isFeatured),
      isBestSeller: Boolean(isBestSeller),
      isActive: req.body.isActive === undefined ? true : Boolean(req.body.isActive),
      attributes: Object.keys(normalizedAttributes).length ? normalizedAttributes : undefined
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
    res.json({ ok: true, data: saved.toObject() })
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

export const materialTypes = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })

    const [goldLatest, silverLatest, diamondLatest] = await Promise.all([
      GoldRate.aggregate([
        { $sort: { date: -1, createdAt: -1, _id: -1 } },
        { $group: { _id: '$carat', carat: { $first: '$carat' }, purity: { $first: '$purity' }, price: { $first: '$ratePer10Gram' } } },
        { $project: { _id: 0, carat: 1, purity: 1, price: 1 } },
        { $sort: { carat: -1 } }
      ]),
      SilverRate.aggregate([
        { $sort: { date: -1, createdAt: -1, _id: -1 } },
        { $group: { _id: '$purityMark', purityMark: { $first: '$purityMark' }, purity: { $first: '$purityPercent' }, price: { $first: '$ratePerKg' } } },
        { $project: { _id: 0, purityMark: 1, purity: 1, price: 1 } },
        { $sort: { purityMark: -1 } }
      ]),
      DiamondPrice.aggregate([
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
