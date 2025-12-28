import mongoose, { Schema } from 'mongoose'

const PriceSchema = new Schema(
  {
    currency: { type: String, default: 'INR', uppercase: true },
    amount: { type: Number, required: true, min: 0 }
  },
  { _id: false }
)

const VariantSchema = new Schema(
  {
    title: { type: String, default: 'Default', trim: true },
    sku: { type: String, trim: true },
    images: [{ type: String }],
    image: { type: String },
    video: { type: String },
    makingCost: { type: PriceSchema, required: false },
    otherCharges: { type: PriceSchema, required: false },
    stock: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    attributes: { type: Schema.Types.Mixed }
  },
  { _id: true }
)

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    variants: {
      type: [VariantSchema],
      required: true,
      validate: [(v) => Array.isArray(v) && v.length > 0, 'At least one variant is required']
    },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: false },
    subCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory', required: false },
    isActive: { type: Boolean, default: true },
    attributes: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
)

ProductSchema.pre('validate', function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
  }
  next()
})

export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema)
