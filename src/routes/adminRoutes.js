import express from 'express';
import {
  getUsers,
  updateUserRole,
  toggleUserBan,
  verifyReport,
  deleteReport,
  broadcastAnnouncement,
  getSystemAuditLogs,
  exportCSV
} from '../controllers/adminController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'moderator'));

router.get('/users', getUsers);
router.patch('/users/:id/role', authorize('admin'), updateUserRole);
router.patch('/users/:id/ban', authorize('admin'), toggleUserBan);

router.patch('/reports/:id/verify', verifyReport);
router.delete('/reports/:id', authorize('admin'), deleteReport);

router.post('/announcement', broadcastAnnouncement);
router.get('/audit-logs', getSystemAuditLogs);
router.get('/export-csv', exportCSV);

export default router;
