import { AdminService } from '../services/adminService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/errorMiddleware.js';

export const getUsers = asyncHandler(async (req, res) => {
  const { query, page, limit } = req.query;
  const result = await AdminService.getUsers({ query, page: page || 1, limit: limit || 10 });
  return ApiResponse.paginated(res, 'Users fetched', result.users, result.page, result.limit, result.total);
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const user = await AdminService.updateUserRole(id, role);
  return ApiResponse.success(res, 'User role updated', { user });
});

export const toggleUserBan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await AdminService.toggleUserBan(id);
  return ApiResponse.success(res, result.message, result);
});

export const verifyReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const report = await AdminService.verifyReport(id, status || 'verified');
  return ApiResponse.success(res, `Report marked as ${status || 'verified'}`, { report });
});

export const deleteReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await AdminService.deleteReport(id);
  return ApiResponse.success(res, result.message);
});

export const broadcastAnnouncement = asyncHandler(async (req, res) => {
  const { title, message } = req.body;
  if (!title || !message) {
    return ApiResponse.error(res, 'Title and message are required', 400);
  }
  const result = await AdminService.broadcastAnnouncement({ title, message });
  return ApiResponse.success(res, result.message, result);
});

export const getSystemAuditLogs = asyncHandler(async (req, res) => {
  const logs = await AdminService.getSystemAuditLogs();
  return ApiResponse.success(res, 'Audit logs retrieved', { logs });
});

export const exportCSV = asyncHandler(async (req, res) => {
  const csvData = await AdminService.generateCSVExport();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=ScamShield-Reports-Database.csv');
  return res.send(csvData);
});
