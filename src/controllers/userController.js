import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { AuditLog } from '../models/AuditLog.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import { updateProfileSchema, changePasswordSchema } from '../validators/authValidator.js';

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) {
    return ApiResponse.error(res, 'User not found', 404);
  }
  return ApiResponse.success(res, 'Profile retrieved', { user });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const validated = updateProfileSchema.parse(req.body);
  const user = await User.findByIdAndUpdate(req.user.id, validated, { new: true, runValidators: true }).select('-password');
  return ApiResponse.success(res, 'Profile updated successfully', { user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  const user = await User.findById(req.user.id).select('+password');

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return ApiResponse.error(res, 'Incorrect current password', 400);
  }

  user.password = newPassword;
  await user.save();

  await AuditLog.create({
    user: user._id,
    action: 'PASSWORD_CHANGED',
    ipAddress: req.ip
  });

  return ApiResponse.success(res, 'Password updated successfully');
});

export const getSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ user: req.user.id }).sort({ createdAt: -1 });
  return ApiResponse.success(res, 'Active sessions retrieved', { sessions });
});

export const getAuditLogs = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(20);
  return ApiResponse.success(res, 'Activity audit logs retrieved', { logs });
});
