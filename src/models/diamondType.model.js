import mongoose, { Schema } from 'mongoose'

const DiamondTypeSchema = new Schema(
  {
    origin: { type: String, required: true, enum: ['Natural', 'Lab-Grown'] },
    shape: { type: String, required: true, trim: true },
    cut: { type: String, required: true, enum: ['Excellent', 'Very Good', 'Good'] },
    color: { type: String, required: true, trim: true, uppercase: true },
    clarity: { type: String, required: true, trim: true, uppercase: true }
  },
  { timestamps: true }
)

export const DiamondType = mongoose.models.DiamondType || mongoose.model('DiamondType', DiamondTypeSchema)
