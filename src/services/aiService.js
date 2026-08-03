import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/appError.js';

const genAI = config.geminiApiKey && config.geminiApiKey !== 'mock_gemini_key'
  ? new GoogleGenerativeAI(config.geminiApiKey)
  : null;

export class AIService {
  /**
   * Deep AI Threat Analysis via Gemini LLM
   * Returns ONLY dynamically generated structured JSON. Zero static templates.
   */
  static async analyzeScamText(cleanedText, scamContextType = 'Text') {
    if (!cleanedText || cleanedText.trim().length === 0) {
      throw new AppError('Low OCR Confidence. Unable to detect enough readable text. Please upload a clearer screenshot.', 400);
    }

    logger.info(`[AI Engine] Analyzing ${scamContextType} content (Cleaned Length: ${cleanedText.length})`);

    const systemPrompt = `
You are ScamShield AI, an elite cybersecurity & digital fraud detection intelligence system.
Analyze the following text content extracted from a user's screenshot or message for potential scams, phishing, fraud, or impersonation.

CRITICAL INSTRUCTIONS:
1. You MUST generate your response ONLY based on the provided text content. Do NOT use static templates.
2. The category MUST be dynamically determined based on the actual scam mechanism in the text. Examples include:
   - "Fake Job"
   - "Bank Scam"
   - "UPI Scam"
   - "Lottery Scam"
   - "Courier Scam"
   - "Crypto Scam"
   - "Telegram Scam"
   - "WhatsApp Scam"
   - "Instagram Scam"
   - "Investment Scam"
   - "Phishing"
   - "Loan Scam"
   - "Fake Internship"
   - "Identity Theft"
   - "Romance Scam"
   - "Government Scheme Scam"
   - "Electricity Bill Scam"
   - "Safe Content"
   - Or any custom descriptive category fitting the input.
3. Calculate a precise Risk Score from 0 to 100:
   - Safe: 0 to 20
   - Low Risk: 21 to 40
   - Medium Risk: 41 to 60
   - High Risk: 61 to 80
   - Critical Risk: 81 to 100
4. You MUST return ONLY a valid raw JSON object matching EXACTLY the following structure (no markdown formatting, no code block wrappers outside JSON):

{
  "category": "<Dynamic Scam Category>",
  "riskScore": <Number between 0 and 100>,
  "confidenceScore": <Number between 0 and 100>,
  "summary": "<Highly specific multi-sentence explanation tailored strictly to the uploaded text>",
  "redFlags": [
    "<Specific threat evidence item 1>",
    "<Specific threat evidence item 2>"
  ],
  "recommendations": [
    "<Category-specific immediate action 1>",
    "<Category-specific immediate action 2>"
  ],
  "keywords": [
    "<Flagged keyword 1>",
    "<Flagged keyword 2>"
  ],
  "decisionMatrix": [
    { "indicator": "<Flagged threat indicator/keyword>", "weight": <Number positive threat weight, e.g. 25> }
  ],
  "reasoning": [
    "<Step-by-step logic point explaining why this risk score was calculated>"
  ]
}

Text to analyze:
"""
${cleanedText}
"""
`;

    if (!genAI) {
      logger.error('[AI Engine Error] GEMINI_API_KEY is not configured in environment variables.');
      throw new AppError('Analysis Failed. GEMINI_API_KEY is missing or invalid. Please check server setup.', 500);
    }

    // Function to execute Gemini API call
    const executeGeminiCall = async () => {
      logger.info('[AI Engine Gemini Prompting] Sending prompt to gemini-1.5-flash...');
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(systemPrompt);
      const responseText = result.response.text();
      logger.info(`[AI Engine Gemini Raw Response] ${responseText.substring(0, 200)}...`);

      // Clean JSON formatting markdown code blocks if present
      const cleanJsonStr = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleanJsonStr);

      // Validate required JSON fields
      if (typeof parsed.riskScore !== 'number' || !parsed.category || !parsed.summary) {
        throw new Error('Incomplete JSON response schema from Gemini API');
      }

      return {
        category: String(parsed.category).trim(),
        riskScore: Math.min(100, Math.max(0, Number(parsed.riskScore) || 0)),
        confidenceScore: Math.min(100, Math.max(0, Number(parsed.confidenceScore || parsed.confidence) || 85)),
        summary: String(parsed.summary || parsed.detailedExplanation || '').trim(),
        detailedExplanation: String(parsed.summary || parsed.detailedExplanation || '').trim(),
        redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : (Array.isArray(parsed.reasons) ? parsed.reasons : []),
        reasons: Array.isArray(parsed.redFlags) ? parsed.redFlags : (Array.isArray(parsed.reasons) ? parsed.reasons : []),
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : (Array.isArray(parsed.safetyTips) ? parsed.safetyTips : []),
        safetyTips: Array.isArray(parsed.recommendations) ? parsed.recommendations : (Array.isArray(parsed.safetyTips) ? parsed.safetyTips : []),
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        decisionMatrix: Array.isArray(parsed.decisionMatrix) ? parsed.decisionMatrix : [],
        reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : []
      };
    };

    // Retry Mechanism (1 Retry on failure)
    try {
      return await executeGeminiCall();
    } catch (firstError) {
      logger.warn(`[AI Engine Retry] Initial Gemini API call failed (${firstError.message}). Retrying once...`);
      try {
        return await executeGeminiCall();
      } catch (retryError) {
        logger.error(`[AI Engine Error] Gemini API retry failed: ${retryError.message}`);
        throw new AppError('Analysis Failed. Unable to generate report. Please try again.', 500);
      }
    }
  }
}
