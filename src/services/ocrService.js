import { createWorker } from 'tesseract.js';
import { logger } from '../utils/logger.js';

export const extractTextFromImage = async (imageBufferOrPath) => {
  let worker;
  try {
    worker = await createWorker('eng');
    const ret = await worker.recognize(imageBufferOrPath);
    await worker.terminate();
    logger.info(`[OCR Service] Successfully extracted ${ret.data.text.length} characters from screenshot`);
    return ret.data.text.trim();
  } catch (error) {
    logger.error(`[OCR Error] Text extraction failed: ${error.message}`);
    if (worker) {
      await worker.terminate();
    }
    throw new Error(`OCR Processing failed: ${error.message}`);
  }
};
