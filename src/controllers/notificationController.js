import { NotificationService } from '../services/notificationService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/errorMiddleware.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const result = await NotificationService.getUserNotifications(req.user.id);
  return ApiResponse.success(res, 'Notifications retrieved', result);
});

export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await NotificationService.markAsRead(id, req.user.id);
  return ApiResponse.success(res, result.message);
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await NotificationService.markAllAsRead(req.user.id);
  return ApiResponse.success(res, result.message);
});
