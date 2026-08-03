import mongoose from 'mongoose';

const scamDatabaseSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    type: {
      type: String,
      enum: ['phone', 'email', 'url', 'upi'],
      required: true
    },
    totalReports: { type: Number, default: 1 },
    riskScore: { type: Number, default: 80 },
    verifiedScam: { type: Boolean, default: false },
    categories: [{ type: String }],
    lastReportedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const ScamDatabase = mongoose.model('ScamDatabase', scamDatabaseSchema);
