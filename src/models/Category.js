import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    icon: { type: String, default: 'ShieldAlert' },
    description: { type: String, default: '' },
    reportCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Category = mongoose.model('Category', categorySchema);
