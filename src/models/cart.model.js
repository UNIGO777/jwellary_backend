import mongoose, { Schema } from 'mongoose'

const CartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }
  },
  { timestamps: true }
)

CartSchema.index({ user: 1, product: 1 }, { unique: true })

export const Cart = mongoose.models.Cart || mongoose.model('Cart', CartSchema)
