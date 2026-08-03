import express from 'express';
import {
  createReport,
  getReports,
  getReportById,
  voteReport,
  addComment,
  toggleBookmark,
  getBookmarks
} from '../controllers/reportController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getReports);
router.get('/:id', getReportById);

// Protected routes requiring login
router.use(protect);
router.post('/', createReport);
router.post('/:id/vote', voteReport);
router.post('/:id/comments', addComment);
router.post('/:id/bookmark', toggleBookmark);
router.get('/user/bookmarks', getBookmarks);

export default router;
