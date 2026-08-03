import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema(
  {
    report: { type: mongoose.Schema.Types.ObjectId, ref: 'ScamReport', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['upvote', 'downvote'], required: true }
  },
  { timestamps: true }
);

voteSchema.index({ report: 1, user: 1 }, { unique: true });

export const Vote = mongoose.model('Vote', voteSchema);
