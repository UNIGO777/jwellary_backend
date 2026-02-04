import mongoose, { Schema } from 'mongoose'

const GoldRateSchema = new Schema(
  {
    carat: { type: Number, required: true, enum: [24, 22, 20, 18, 14] },
    purity: { type: Number, required: true, min: 0 },
    ratePer10Gram: { type: Number, required: true, min: 0 },
    date: { type: Date, default: () => new Date() }
  },
  { timestamps: true }
)

export const GoldRate = mongoose.models.GoldRate || mongoose.model('GoldRate', GoldRateSchema)
