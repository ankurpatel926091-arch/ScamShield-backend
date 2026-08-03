import { ScamReport } from '../models/ScamReport.js';
import { ScamDatabase } from '../models/ScamDatabase.js';
import { Comment } from '../models/Comment.js';
import { Vote } from '../models/Vote.js';
import { Bookmark } from '../models/Bookmark.js';
import { Notification } from '../models/Notification.js';
import { AIService } from './aiService.js';

export class ReportService {
  static async createReport(userId, data) {
    // Run AI analysis if detailed explanation not provided
    let aiAnalysis = data.aiAnalysis;
    if (!aiAnalysis) {
      aiAnalysis = await AIService.analyzeScamText(`${data.title}\n${data.description}`, data.scamType);
    }

    const report = await ScamReport.create({
      reporter: userId,
      ...data,
      aiAnalysis,
      riskScore: data.riskScore || aiAnalysis.riskScore || 50,
      confidenceScore: aiAnalysis.confidenceScore || 85,
      status: 'pending'
    });

    // Update or insert into ScamDatabase registry if phone or email is provided
    if (data.scammerDetails?.phone) {
      const cleanPhone = data.scammerDetails.phone.replace(/[^0-9+]/g, '');
      if (cleanPhone) {
        await ScamDatabase.findOneAndUpdate(
          { identifier: cleanPhone, type: 'phone' },
          {
            $inc: { totalReports: 1 },
            $addToSet: { categories: data.category },
            lastReportedAt: new Date()
          },
          { upsert: true }
        );
      }
    }

    if (data.scammerDetails?.email) {
      const cleanEmail = data.scammerDetails.email.trim().toLowerCase();
      if (cleanEmail) {
        await ScamDatabase.findOneAndUpdate(
          { identifier: cleanEmail, type: 'email' },
          {
            $inc: { totalReports: 1 },
            $addToSet: { categories: data.category },
            lastReportedAt: new Date()
          },
          { upsert: true }
        );
      }
    }

    return report;
  }

  static async getReports({ query = '', category = '', scamType = '', status = '', page = 1, limit = 10, sort = '-createdAt' }) {
    const filter = {};

    if (category) filter.category = category;
    if (scamType) filter.scamType = scamType;
    if (status) filter.status = status;

    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { 'scammerDetails.phone': { $regex: query, $options: 'i' } },
        { 'scammerDetails.email': { $regex: query, $options: 'i' } },
        { 'scammerDetails.upiId': { $regex: query, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const reports = await ScamReport.find(filter)
      .populate('reporter', 'name avatar isVerified')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await ScamReport.countDocuments(filter);

    return { reports, total, page: Number(page), limit: Number(limit) };
  }

  static async getReportById(reportId) {
    const report = await ScamReport.findByIdAndUpdate(
      reportId,
      { $inc: { viewsCount: 1 } },
      { new: true }
    ).populate('reporter', 'name avatar isVerified role');

    if (!report) {
      throw new Error('Scam report not found');
    }

    const comments = await Comment.find({ report: reportId })
      .populate('author', 'name avatar')
      .sort({ createdAt: -1 });

    return { report, comments };
  }

  static async voteReport(reportId, userId, type) {
    const existingVote = await Vote.findOne({ report: reportId, user: userId });

    if (existingVote) {
      if (existingVote.type === type) {
        // Toggle off vote
        await Vote.deleteOne({ _id: existingVote._id });
        const incField = type === 'upvote' ? { upvotesCount: -1 } : { downvotesCount: -1 };
        await ScamReport.findByIdAndUpdate(reportId, { $inc: incField });
        return { message: 'Vote removed' };
      } else {
        // Change vote
        existingVote.type = type;
        await existingVote.save();
        const incField = type === 'upvote' ? { upvotesCount: 1, downvotesCount: -1 } : { upvotesCount: -1, downvotesCount: 1 };
        await ScamReport.findByIdAndUpdate(reportId, { $inc: incField });
        return { message: 'Vote updated' };
      }
    }

    await Vote.create({ report: reportId, user: userId, type });
    const incField = type === 'upvote' ? { upvotesCount: 1 } : { downvotesCount: 1 };
    await ScamReport.findByIdAndUpdate(reportId, { $inc: incField });

    return { message: 'Vote recorded' };
  }

  static async addComment(reportId, userId, content) {
    const comment = await Comment.create({
      report: reportId,
      author: userId,
      content
    });

    const populated = await Comment.findById(comment._id).populate('author', 'name avatar');
    return populated;
  }

  static async toggleBookmark(reportId, userId) {
    const existing = await Bookmark.findOne({ report: reportId, user: userId });
    if (existing) {
      await Bookmark.deleteOne({ _id: existing._id });
      return { isBookmarked: false, message: 'Bookmark removed' };
    }
    await Bookmark.create({ report: reportId, user: userId });
    return { isBookmarked: true, message: 'Report bookmarked' };
  }

  static async getUserBookmarks(userId) {
    const bookmarks = await Bookmark.find({ user: userId }).populate({
      path: 'report',
      populate: { path: 'reporter', select: 'name avatar' }
    });
    return bookmarks.map(b => b.report);
  }
}
