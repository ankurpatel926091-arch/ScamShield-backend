import { Notification } from '../models/Notification.js';
import { getIO } from '../utils/socket.js';
import { logger } from '../utils/logger.js';

export class NotificationService {
  static async sendNotification({ recipient, title, message, type = 'system_announcement', link = '' }) {
    try {
      const notification = await Notification.create({
        recipient,
        title,
        message,
        type,
        link
      });

      // Real-time Socket.IO broadcast to recipient room
      const io = getIO();
      if (io) {
        io.to(recipient.toString()).emit('new_notification', notification);
      }

      return notification;
    } catch (error) {
      logger.error(`[Notification Service Error] ${error.message}`);
      return null;
    }
  }

  static async getUserNotifications(userId) {
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    return { notifications, unreadCount };
  }

  static async markAsRead(notificationId, userId) {
    await Notification.findOneAndUpdate({ _id: notificationId, recipient: userId }, { isRead: true });
    return { message: 'Notification marked as read' };
  }

  static async markAllAsRead(userId) {
    await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
    return { message: 'All notifications marked as read' };
  }
}
