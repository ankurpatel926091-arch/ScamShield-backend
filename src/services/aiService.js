import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const genAI = config.geminiApiKey && config.geminiApiKey !== 'mock_gemini_key'
  ? new GoogleGenerativeAI(config.geminiApiKey)
  : null;

export class AIService {
  static async analyzeScamText(rawText, scamContextType = 'Text') {
    logger.info(`[AI Engine] Analyzing ${scamContextType} content (length: ${rawText.length})`);

    const systemPrompt = `
You are ScamShield AI, an elite cybersecurity & digital fraud detection intelligence system.
Analyze the following text content for potential scams, phishing, fraud, or impersonation.

Output MUST be a valid JSON object matching EXACTLY this structure (no markdown formatting outside json):
{
  "riskScore": number (0 to 100),
  "confidenceScore": number (0 to 100),
  "category": string (One of: "Phishing", "Fake Job", "Lottery / Prize", "UPI / QR Code", "Bank Scam", "Telegram Scam", "WhatsApp Fraud", "Crypto Fraud", "Investment Trap", "Loan Scam", "Instagram Impersonation", "Fake Internship", "E-Commerce Fraud", "Other"),
  "reasons": [array of short string red flags],
  "detailedExplanation": string,
  "safetyTips": [array of short actionable safety tips],
  "recommendedActions": [array of recommended immediate actions]
}

Content to analyze:
"""
${rawText}
"""
`;

    if (!genAI) {
      logger.warn('[AI Engine] GEMINI_API_KEY not configured or set to mock. Using intelligent heuristic analysis.');
      return this.heuristicScamAnalysis(rawText, scamContextType);
    }

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(systemPrompt);
      const responseText = result.response.text();

      // Clean JSON string response
      const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);

      return {
        riskScore: Math.min(100, Math.max(0, parsed.riskScore || 50)),
        confidenceScore: Math.min(100, Math.max(0, parsed.confidenceScore || 85)),
        category: parsed.category || 'Phishing',
        reasons: parsed.reasons || ['Suspicious wording detected'],
        detailedExplanation: parsed.detailedExplanation || 'The analyzed text exhibits common scam indicators.',
        safetyTips: parsed.safetyTips || ['Never transfer money to unverified callers.'],
        recommendedActions: parsed.recommendedActions || ['Block the sender and report to authorities.']
      };
    } catch (error) {
      logger.error(`[AI Engine Gemini Error] ${error.message}. Falling back to heuristic analysis.`);
      return this.heuristicScamAnalysis(rawText, scamContextType);
    }
  }

  static heuristicScamAnalysis(text, contextType) {
    const textLower = text.toLowerCase();
    let riskScore = 20;
    const reasons = [];
    const safetyTips = ['Never share OTPs, PINs, or passwords with anyone.'];
    const recommendedActions = ['Block the sender number or email address immediately.'];

    // Keywords check
    if (/lottery|congratulations|won|prize|lucky/i.test(textLower)) {
      riskScore += 35;
      reasons.push('Contains prize/lottery lure keywords');
    }
    if (/part-time|rating|like YouTube|telegram|daily income|₹\d+/i.test(textLower)) {
      riskScore += 40;
      reasons.push('High likelihood of Telegram part-time job/rating scam');
    }
    if (/urgent|account suspended|verify now|electricity bill|disconnection|apk/i.test(textLower)) {
      riskScore += 35;
      reasons.push('Creates artificial urgency or urges APK file installation');
    }
    if (/upi|qr code|send ₹|pay deposit|crypto|binance|guaranteed return/i.test(textLower)) {
      riskScore += 35;
      reasons.push('Requests upfront payment, UPI transfer, or crypto deposit');
    }

    riskScore = Math.min(98, Math.max(15, riskScore));

    let category = 'Phishing';
    if (textLower.includes('job') || textLower.includes('telegram') || textLower.includes('part-time')) {
      category = 'Fake Job';
    } else if (textLower.includes('upi') || textLower.includes('pay') || textLower.includes('qr')) {
      category = 'UPI / QR Code';
    } else if (textLower.includes('lottery') || textLower.includes('prize') || textLower.includes('won')) {
      category = 'Lottery / Prize';
    } else if (textLower.includes('crypto') || textLower.includes('investment')) {
      category = 'Crypto Fraud';
    } else if (textLower.includes('bank') || textLower.includes('account')) {
      category = 'Bank Scam';
    }

    return {
      riskScore,
      confidenceScore: 88,
      category,
      reasons: reasons.length > 0 ? reasons : ['Content analyzed against security heuristics.'],
      detailedExplanation: `Automated security intelligence analyzed this ${contextType} content. The text contains indicators commonly associated with ${category} fraud patterns.`,
      safetyTips: [
        'Do not click on unsolicited links or install unknown .apk packages.',
        'Verify caller credentials directly on the official company portal.',
        ...safetyTips
      ],
      recommendedActions: [
        'Report this incident to local cybercrime cell (e.g. cybercrime.gov.in).',
        ...recommendedActions
      ]
    };
  }
}
