import { AIService } from '../services/aiService.js';
import { extractTextFromImage } from '../services/ocrService.js';
import { URLAnalyzerService } from '../services/urlAnalyzerService.js';
import { PhoneEmailSearchService } from '../services/phoneEmailSearchService.js';
import { generatePDFReport } from '../services/pdfReportService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import { ScamReport } from '../models/ScamReport.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/appError.js';

/**
 * Helper to query MongoDB for similar reports
 */
const findSimilarReportsFromDB = async (category, keywords = []) => {
  try {
    const searchConditions = [];
    if (category) {
      searchConditions.push({ category: new RegExp(category, 'i') });
    }
    if (keywords && keywords.length > 0) {
      searchConditions.push({ tags: { $in: keywords } });
      const regexPattern = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      if (regexPattern) {
        searchConditions.push({ description: { $regex: regexPattern, $options: 'i' } });
      }
    }

    if (searchConditions.length === 0) return [];

    const matches = await ScamReport.find({ $or: searchConditions })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title category riskScore description createdAt status tags viewCount')
      .lean();

    return matches.map((item) => ({
      id: item._id,
      title: item.title,
      category: item.category,
      riskScore: item.riskScore,
      description: item.description,
      createdAt: item.createdAt,
      status: item.status
    }));
  } catch (err) {
    logger.warn(`[Similar Reports DB Warning] ${err.message}`);
    return [];
  }
};

export const scanText = asyncHandler(async (req, res) => {
  const { text, type } = req.body;
  if (!text || text.trim().length < 5) {
    return ApiResponse.error(res, 'Please enter at least 5 characters of suspicious text.', 400);
  }

  const report = await AIService.analyzeScamText(text, type || 'Text');
  const similarReports = await findSimilarReportsFromDB(report.category, report.keywords);

  return ApiResponse.success(res, 'Text scam scan complete', {
    report,
    similarReports,
    ocrPanel: {
      rawText: text,
      cleanedText: text,
      confidence: 100,
      keywords: report.keywords || []
    }
  });
});

export const scanScreenshot = asyncHandler(async (req, res) => {
  let imageBuffer = null;

  if (req.file && req.file.buffer) {
    imageBuffer = req.file.buffer;
  } else if (req.body.imageBase64) {
    const base64Clean = req.body.imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
    imageBuffer = Buffer.from(base64Clean, 'base64');
  }

  if (!imageBuffer) {
    throw new AppError('Low OCR Confidence. Unable to detect enough readable text. Please upload a clearer screenshot.', 400);
  }

  // Step 1: Run OCR with Tesseract.js & validate confidence
  logger.info('[Scan Screenshot] Step 1: Executing OCR Pipeline...');
  const ocrResult = await extractTextFromImage(imageBuffer);

  // Step 2: Send cleaned OCR text to Gemini AI
  logger.info('[Scan Screenshot] Step 2: Executing Gemini AI Analysis...');
  const report = await AIService.analyzeScamText(ocrResult.cleanedText, 'Screenshot');

  // Step 3: Search MongoDB for similar reports
  logger.info('[Scan Screenshot] Step 3: Searching MongoDB for similar reports...');
  const similarReports = await findSimilarReportsFromDB(report.category, ocrResult.keywords);

  logger.info(`[Scan Screenshot Success] Category: ${report.category}, Risk Score: ${report.riskScore}%`);

  return ApiResponse.success(res, 'Screenshot OCR AI scan complete', {
    ocrPanel: {
      rawText: ocrResult.rawText,
      cleanedText: ocrResult.cleanedText,
      confidence: ocrResult.confidence,
      keywords: ocrResult.keywords
    },
    report,
    similarReports
  });
});

export const scanURL = asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url || url.trim().length < 3) {
    return ApiResponse.error(res, 'Valid URL parameter is required', 400);
  }

  const report = await URLAnalyzerService.analyzeURL(url);
  const similarReports = await findSimilarReportsFromDB(report.category, report.keywords);

  return ApiResponse.success(res, 'URL security analysis complete', {
    report,
    similarReports
  });
});

export const searchPhone = asyncHandler(async (req, res) => {
  const { phone } = req.query;
  if (!phone) {
    return ApiResponse.error(res, 'Phone number parameter is required', 400);
  }

  const result = await PhoneEmailSearchService.searchPhoneNumber(phone);
  return ApiResponse.success(res, 'Phone search complete', { result });
});

export const searchEmail = asyncHandler(async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return ApiResponse.error(res, 'Email address parameter is required', 400);
  }

  const result = await PhoneEmailSearchService.searchEmail(email);
  return ApiResponse.success(res, 'Email search complete', { result });
});

export const exportPDF = asyncHandler(async (req, res) => {
  const reportData = req.body;
  const pdfBuffer = await generatePDFReport(reportData);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=ScamShield-AI-Report.pdf');
  return res.send(pdfBuffer);
});
