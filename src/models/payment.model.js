import mongoose, { Schema } from 'mongoose'

const PaymentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    provider: { type: String, required: true }, 
    method: { type: String, required: true }, 
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true },
    status: { type: String, default: 'created', enum: ['created', 'authorized', 'captured', 'failed', 'refunded', 'succeeded'] },
    transactionId: { type: String },
    meta: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
)

export const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema)
