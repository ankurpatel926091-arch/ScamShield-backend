import { User } from '../models/User.js';
import { ScamReport } from '../models/ScamReport.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { NotificationService } from './notificationService.js';
import { getIO } from '../utils/socket.js';

export class AdminService {
  static async getUsers({ query = '', page = 1, limit = 10 }) {
    const filter = {};
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ];
    }
    const skip = (page - 1) * limit;
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
    const total = await User.countDocuments(filter);

    return { users, total, page: Number(page), limit: Number(limit) };
  }

  static async updateUserRole(userId, newRole) {
    const user = await User.findByIdAndUpdate(userId, { role: newRole }, { new: true }).select('-password');
    return user;
  }

  static async toggleUserBan(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    user.isBanned = !user.isBanned;
    await user.save();
    return { isBanned: user.isBanned, message: `User ${user.isBanned ? 'banned' : 'unbanned'} successfully` };
  }

  static async verifyReport(reportId, status = 'verified') {
    const report = await ScamReport.findByIdAndUpdate(reportId, { status }, { new: true }).populate('reporter', 'name email');
    if (!report) throw new Error('Report not found');

    // Send notification to reporter
    if (report.reporter) {
      await NotificationService.sendNotification({
        recipient: report.reporter._id,
        title: '🛡️ Scam Report Verified',
        message: `Your reported scam "${report.title}" has been reviewed and verified by security moderators.`,
        type: 'report_update',
        link: `/report/${report._id}`
      });
    }

    return report;
  }

  static async deleteReport(reportId) {
    await ScamReport.findByIdAndDelete(reportId);
    return { message: 'Scam report deleted successfully' };
  }

  static async broadcastAnnouncement({ title, message }) {
    const users = await User.find({ isBanned: false }).select('_id');
    const notifPromises = users.map(u =>
      NotificationService.sendNotification({
        recipient: u._id,
        title: `📢 ${title}`,
        message,
        type: 'system_announcement'
      })
    );
    await Promise.all(notifPromises);
    return { count: users.length, message: `Announcement broadcasted to ${users.length} users.` };
  }

  static async getSystemAuditLogs() {
    const logs = await AuditLog.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(50);
    return logs;
  }

  static async generateCSVExport() {
    const reports = await ScamReport.find().populate('reporter', 'name email').sort({ createdAt: -1 });

    const headers = ['ReportID', 'Title', 'Category', 'ScamType', 'RiskScore', 'Status', 'Reporter', 'ScammerPhone', 'ScammerEmail', 'CreatedAt'];
    const rows = reports.map(r => [
      r._id.toString(),
      `"${(r.title || '').replace(/"/g, '""')}"`,
      r.category || '',
      r.scamType || '',
      r.riskScore || 0,
      r.status || '',
      r.reporter?.email || 'Anonymous',
      r.scammerDetails?.phone || '',
      r.scammerDetails?.email || '',
      new Date(r.createdAt).toISOString()
    ]);

    const csvString = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    return csvString;
  }
}
