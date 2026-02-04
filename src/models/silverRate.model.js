import mongoose, { Schema } from 'mongoose'

const SilverRateSchema = new Schema(
  {
    purityMark: { type: Number, required: true, enum: [999, 925, 900, 800] },
    purityPercent: { type: Number, required: true, min: 0 },
    ratePerKg: { type: Number, required: true, min: 0 },
    date: { type: Date, default: () => new Date() }
  },
  { timestamps: true }
)

export const SilverRate = mongoose.models.SilverRate || mongoose.model('SilverRate', SilverRateSchema)
