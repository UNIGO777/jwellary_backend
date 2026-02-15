import mongoose from 'mongoose'
import { isDBConnected } from '../config/db.js'
import { Cart } from '../models/cart.model.js'
import { Product } from '../models/product.model.js'
import { GoldRate } from '../models/goldRate.model.js'
import { SilverRate } from '../models/silverRate.model.js'
import { DiamondPrice } from '../models/diamondPrice.model.js'

const isId = (id) => mongoose.isValidObjectId(id)

const asPlainObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value
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

const applyDynamicPricingToCartDocs = async (docs) => {
  const list = Array.isArray(docs) ? docs : []
  if (!list.length) return list

  const goldCarats = []
  const silverMarks = []
  const diamondTypeIds = []

  for (const row of list) {
    const p = row?.product
    if (!p) continue
    const material = p?.material ? String(p.material).toLowerCase() : ''
    const materialType = p?.materialType
    if (material === 'gold') {
      const carat = Number(materialType)
      if (Number.isFinite(carat)) goldCarats.push(carat)
    } else if (material === 'silver') {
      const mark = Number(materialType)
      if (Number.isFinite(mark)) silverMarks.push(mark)
    } else if (material === 'diamond') {
      const id = materialType ? String(materialType) : ''
      if (id && isId(id)) diamondTypeIds.push(id)
    }
  }

  const [goldLatest, silverLatest, diamondLatest] = await Promise.all([
    goldCarats.length
      ? GoldRate.aggregate([
          { $match: { carat: { $in: Array.from(new Set(goldCarats)) }, ratePer10Gram: { $gt: 0 } } },
          { $sort: { date: -1, createdAt: -1, _id: -1 } },
          { $group: { _id: '$carat', carat: { $first: '$carat' }, ratePer10Gram: { $first: '$ratePer10Gram' } } },
          { $project: { _id: 0, carat: 1, ratePer10Gram: 1 } }
        ])
      : [],
    silverMarks.length
      ? SilverRate.aggregate([
          { $match: { purityMark: { $in: Array.from(new Set(silverMarks)) }, ratePerKg: { $gt: 0 } } },
          { $sort: { date: -1, createdAt: -1, _id: -1 } },
          { $group: { _id: '$purityMark', purityMark: { $first: '$purityMark' }, ratePerKg: { $first: '$ratePerKg' } } },
          { $project: { _id: 0, purityMark: 1, ratePerKg: 1 } }
        ])
      : [],
    diamondTypeIds.length
      ? DiamondPrice.aggregate([
          { $match: { diamondType: { $in: Array.from(new Set(diamondTypeIds)) }, pricePerCarat: { $gt: 0 } } },
          { $sort: { date: -1, createdAt: -1, _id: -1 } },
          { $group: { _id: '$diamondType', diamondType: { $first: '$diamondType' }, pricePerCarat: { $first: '$pricePerCarat' } } },
          { $project: { _id: 0, diamondType: 1, pricePerCarat: 1 } }
        ])
      : []
  ])

  const goldByCarat = new Map((goldLatest || []).map((g) => [Number(g?.carat), { ratePer10Gram: g?.ratePer10Gram }]))
  const silverByPurityMark = new Map((silverLatest || []).map((s) => [Number(s?.purityMark), { ratePerKg: s?.ratePerKg }]))
  const diamondByTypeId = new Map((diamondLatest || []).map((d) => [d?.diamondType ? String(d.diamondType) : '', { pricePerCarat: d?.pricePerCarat }]))

  return list.map((row) => {
    if (!row?.product) return row
    return {
      ...row,
      product: applyDynamicPricing({ product: row.product, goldByCarat, silverByPurityMark, diamondByTypeId })
    }
  })
}

export const list = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const userId = req.user?.id
    if (!isId(userId)) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const data = await Cart.find({ user: userId }).populate('product').sort({ createdAt: -1 }).lean()
    const priced = await applyDynamicPricingToCartDocs(data)
    res.json({ ok: true, data: priced })
  } catch (err) {
    next(err)
  }
}

export const add = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const userId = req.user?.id
    if (!isId(userId)) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const { productId } = req.body
    if (!productId || !isId(productId)) return res.status(400).json({ ok: false, message: 'Invalid productId' })

    const product = await Product.findById(productId).lean()
    if (!product) return res.status(404).json({ ok: false, message: 'Product not found' })

    try {
      const doc = await Cart.create({ user: userId, product: productId })
      const populated = await Cart.findById(doc._id).populate('product').lean()
      const priced = (await applyDynamicPricingToCartDocs([populated]))[0]
      return res.status(201).json({ ok: true, data: priced })
    } catch (err) {
      if (err?.code === 11000) {
        const existing = await Cart.findOne({ user: userId, product: productId }).populate('product').lean()
        const priced = (await applyDynamicPricingToCartDocs([existing]))[0]
        return res.json({ ok: true, data: priced })
      }
      throw err
    }
  } catch (err) {
    next(err)
  }
}

export const remove = async (req, res, next) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ ok: false, message: 'Database not connected' })
    const userId = req.user?.id
    if (!isId(userId)) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const productId = req.params.productId
    if (!productId || !isId(productId)) return res.status(400).json({ ok: false, message: 'Invalid productId' })
    await Cart.deleteOne({ user: userId, product: productId })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
