import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    report: { type: mongoose.Schema.Types.ObjectId, ref: 'ScamReport', required: true }
  },
  { timestamps: true }
);

bookmarkSchema.index({ user: 1, report: 1 }, { unique: true });

export const Bookmark = mongoose.model('Bookmark', bookmarkSchema);
