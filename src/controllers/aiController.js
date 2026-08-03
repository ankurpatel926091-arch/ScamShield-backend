import { AIService } from '../services/aiService.js';
import { extractTextFromImage } from '../services/ocrService.js';
import { URLAnalyzerService } from '../services/urlAnalyzerService.js';
import { PhoneEmailSearchService } from '../services/phoneEmailSearchService.js';
import { generatePDFReport } from '../services/pdfReportService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/errorMiddleware.js';

export const scanText = asyncHandler(async (req, res) => {
  const { text, type } = req.body;
  if (!text || text.trim().length === 0) {
    return ApiResponse.error(res, 'Text content is required for AI scan', 400);
  }

  const report = await AIService.analyzeScamText(text, type || 'Text');
  return ApiResponse.success(res, 'Text scam scan complete', { report });
});

export const scanScreenshot = asyncHandler(async (req, res) => {
  // If file uploaded or base64 text provided
  let textToAnalyze = req.body.extractedText;

  if (!textToAnalyze && req.file) {
    textToAnalyze = await extractTextFromImage(req.file.buffer);
  } else if (!textToAnalyze && req.body.imageBase64) {
    const base64Data = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    textToAnalyze = await extractTextFromImage(buffer);
  }

  if (!textToAnalyze) {
    return ApiResponse.error(res, 'Could not extract text from screenshot. Please upload a clear image or paste text manually.', 400);
  }

  const report = await AIService.analyzeScamText(textToAnalyze, 'Screenshot');
  return ApiResponse.success(res, 'Screenshot OCR AI scan complete', { extractedText: textToAnalyze, report });
});

export const scanURL = asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return ApiResponse.error(res, 'URL is required', 400);
  }

  const report = await URLAnalyzerService.analyzeURL(url);
  return ApiResponse.success(res, 'URL security analysis complete', { report });
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
