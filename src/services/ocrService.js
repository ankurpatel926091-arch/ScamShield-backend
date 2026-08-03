import { createWorker } from 'tesseract.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/appError.js';

/**
 * Clean and normalize OCR raw text
 */
export const cleanOcrText = (rawText) => {
  if (!rawText) return '';

  return rawText
    .replace(/[^\w\s.,!?:;/@#$%&*()+\-=\[\]'"]/gi, ' ') // Remove non-printable OCR noise characters
    .replace(/\s+/g, ' ')                             // Collapse multiple spaces/newlines to single space
    .replace(/(\w+)-\s+(\w+)/g, '$1$2')               // Rejoin hyphenated words broken across lines
    .trim();
};

/**
 * Extract suspicious threat keywords from OCR text
 */
export const extractDetectedKeywords = (text) => {
  if (!text) return [];

  const threatPatterns = [
    /\b(registration fee|upfront fee|processing fee|security deposit|refundable fee)\b/i,
    /\b(telegram|whatsapp|instagram|part-time|work from home|daily income|rating job|like youtube)\b/i,
    /\b(upi|qr code|gpay|phonepe|paytm|collect request|upi pin)\b/i,
    /\b(urgent|account suspended|electricity bill|disconnection|kyc update|apk)\b/i,
    /\b(congratulations|lottery|lucky winner|prize|claim reward)\b/i,
    /\b(crypto|investment|guaranteed return|binance|deposit)\b/i,
    /\b(bank|account blocked|otp|cvv|password)\b/i,
    /\b(courier|customs duty|parcel stuck|fedex|dhl)\b/i
  ];

  const found = new Set();
  threatPatterns.forEach((pattern) => {
    const match = text.match(pattern);
    if (match) {
      found.add(match[0].toLowerCase());
    }
  });

  return Array.from(found);
};

/**
 * Perform OCR using Tesseract.js with confidence score evaluation
 */
export const extractTextFromImage = async (imageBufferOrPath) => {
  let worker;
  try {
    worker = await createWorker('eng');
    const ret = await worker.recognize(imageBufferOrPath);
    await worker.terminate();

    const rawText = ret.data.text ? ret.data.text.trim() : '';
    const confidence = Math.round(ret.data.confidence || 0);
    const cleanedText = cleanOcrText(rawText);
    const keywords = extractDetectedKeywords(cleanedText);

    logger.info(`[OCR Pipeline] Confidence: ${confidence}%, Raw Length: ${rawText.length}, Cleaned Length: ${cleanedText.length}`);
    logger.info(`[OCR Raw Output] "${rawText.substring(0, 150)}..."`);
    logger.info(`[OCR Cleaned Text] "${cleanedText.substring(0, 150)}..."`);

    // Strict Validation: Confidence below 40% or insufficient text
    const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;
    if (confidence < 40 || wordCount < 3) {
      logger.warn(`[OCR Rejected] Low confidence (${confidence}%) or insufficient words (${wordCount}).`);
      throw new AppError(
        'Low OCR Confidence. Unable to detect enough readable text. Please upload a clearer screenshot.',
        400
      );
    }

    return {
      rawText,
      cleanedText,
      confidence,
      keywords
    };
  } catch (error) {
    if (worker) {
      try {
        await worker.terminate();
      } catch (e) {
        // ignore cleanup error
      }
    }

    if (error instanceof AppError) {
      throw error;
    }

    logger.error(`[OCR Service Error] ${error.message}`);
    throw new AppError('Low OCR Confidence. Unable to detect enough readable text. Please upload a clearer screenshot.', 400);
  }
};
