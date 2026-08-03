import express from 'express';
import {
  scanText,
  scanScreenshot,
  scanURL,
  searchPhone,
  searchEmail,
  exportPDF
} from '../controllers/aiController.js';
import { aiScanLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

router.post('/scan-text', aiScanLimiter, scanText);
router.post('/scan-screenshot', aiScanLimiter, scanScreenshot);
router.post('/scan-url', aiScanLimiter, scanURL);
router.get('/search-phone', searchPhone);
router.get('/search-email', searchEmail);
router.post('/export-pdf', exportPDF);

export default router;
