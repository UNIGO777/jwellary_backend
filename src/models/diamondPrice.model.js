import mongoose, { Schema } from 'mongoose'

const DiamondPriceSchema = new Schema(
  {
    diamondType: { type: Schema.Types.ObjectId, ref: 'DiamondType', required: true },
    pricePerCarat: { type: Number, required: true, min: 0 },
    date: { type: Date, default: () => new Date() }
  },
  { timestamps: true }
)

export const DiamondPrice = mongoose.models.DiamondPrice || mongoose.model('DiamondPrice', DiamondPriceSchema)
