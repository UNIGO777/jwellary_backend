import mongoose, { Schema } from 'mongoose'

const OrderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String }
  },
  { _id: false }
)

const AddressSchema = new Schema(
  {
    name: { type: String },
    phone: { type: String },
    line1: { type: String },
    line2: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String, default: 'IN' }
  },
  { _id: false }
)

const OrderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, default: 'pending', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] },
    promocode: { type: Schema.Types.ObjectId, ref: 'PromoCode' },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
    customerEmail: { type: String },
    customerPhone: { type: String },
    shippingAddress: { type: AddressSchema },
    notes: { type: String }
  },
  { timestamps: true }
)

export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema)
