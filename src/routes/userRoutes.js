import express from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  getSessions,
  getAuditLogs
} from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); // All user routes require valid JWT

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.get('/sessions', getSessions);
router.get('/audit-logs', getAuditLogs);

export default router;
