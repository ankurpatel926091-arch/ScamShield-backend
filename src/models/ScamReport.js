import mongoose from 'mongoose';

const scamReportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Report title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description is required']
    },
    scamType: {
      type: String,
      enum: ['Screenshot', 'Text', 'URL', 'Phone', 'Email'],
      required: true
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Phishing',
        'Fake Job',
        'Lottery / Prize',
        'UPI / QR Code',
        'Bank Scam',
        'Telegram Scam',
        'WhatsApp Fraud',
        'Crypto Fraud',
        'Investment Trap',
        'Loan Scam',
        'Instagram Impersonation',
        'Fake Internship',
        'E-Commerce Fraud',
        'Other'
      ]
    },
    evidenceUrls: [{ type: String }],
    scammerDetails: {
      phone: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true },
      website: { type: String, trim: true },
      upiId: { type: String, trim: true },
      socialHandle: { type: String, trim: true }
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 85
    },
    aiAnalysis: {
      reasons: [{ type: String }],
      detailedExplanation: { type: String },
      safetyTips: [{ type: String }],
      recommendedActions: [{ type: String }]
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'under_review'],
      default: 'pending'
    },
    upvotesCount: { type: Number, default: 0 },
    downvotesCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

scamReportSchema.index({ title: 'text', description: 'text', 'scammerDetails.phone': 1, 'scammerDetails.email': 1 });

export const ScamReport = mongoose.model('ScamReport', scamReportSchema);
