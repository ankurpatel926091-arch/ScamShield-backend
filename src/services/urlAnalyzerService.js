import { URL } from 'url';
import { AIService } from './aiService.js';
import { logger } from '../utils/logger.js';

export class URLAnalyzerService {
  static async analyzeURL(inputUrl) {
    let formattedUrl = inputUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'http://' + formattedUrl;
    }

    const flags = [];
    const decisionMatrix = [];
    let hostname = '';
    let isHttps = false;
    let isIpAddress = false;
    let isSuspiciousTld = false;

    try {
      const parsed = new URL(formattedUrl);
      hostname = parsed.hostname.toLowerCase();
      isHttps = parsed.protocol === 'https:';
      isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

      const suspiciousTlds = ['.xyz', '.top', '.tk', '.online', '.site', '.club', '.work', '.info', '.biz', '.cc', '.ru', '.cf', '.ga', '.ml', '.gq'];
      isSuspiciousTld = suspiciousTlds.some((tld) => hostname.endsWith(tld));

      // 1. HTTP vs HTTPS Check
      if (!isHttps) {
        flags.push('HTTP (No SSL)');
        decisionMatrix.push({ indicator: 'HTTP (No SSL) Unencrypted Connection', weight: 25 });
      }

      // 2. IP Address Hostname Check
      if (isIpAddress) {
        flags.push('Unknown Domain / Raw IP');
        decisionMatrix.push({ indicator: 'Raw IP Hostname (No Domain Record)', weight: 35 });
      }

      // 3. Suspicious TLD / Domain Reputation Low
      if (isSuspiciousTld) {
        flags.push('Domain Reputation Low');
        flags.push('Suspicious TLD Extension');
        decisionMatrix.push({ indicator: 'Low Reputation TLD Extension', weight: 20 });
      }

      // 4. Typosquatting & Brand Impersonation Check
      const brandPatterns = [
        { brand: 'Amazon', regex: /amaz[o0]n|amzn/i },
        { brand: 'SBI Bank', regex: /sbi|statebank/i },
        { brand: 'HDFC Bank', regex: /hdfc/i },
        { brand: 'ICICI Bank', regex: /icici/i },
        { brand: 'Paytm', regex: /paytm/i },
        { brand: 'Google', regex: /g[o0]{2}gle/i },
        { brand: 'WhatsApp', regex: /whatsa?pp/i },
        { brand: 'Telegram', regex: /telegr?am/i },
        { brand: 'TCS', regex: /tcs/i },
        { brand: 'Flipkart', regex: /flipkart/i }
      ];

      brandPatterns.forEach(({ brand, regex }) => {
        if (regex.test(hostname) && !hostname.endsWith(`.${brand.toLowerCase().replace(/\s+/g, '')}.com`)) {
          flags.push(`Fake Brand Impersonation (${brand})`);
          flags.push('Typosquatting');
          decisionMatrix.push({ indicator: `Typosquatting / ${brand} Impersonation`, weight: 30 });
        }
      });

      // 5. Credential Harvesting & Free Lure Keywords
      const fullPath = (parsed.hostname + parsed.pathname + parsed.search).toLowerCase();
      if (/login|signin|verify|account|pass|kyc|update|auth/i.test(fullPath)) {
        flags.push('Credential Harvesting');
        flags.push('Fake Login Page');
        decisionMatrix.push({ indicator: 'Credential Harvesting Login Lure', weight: 25 });
      }

      if (/free|reward|claim|bonus|gift|dhamaka|cashback|win|lucky/i.test(fullPath)) {
        flags.push('Free Offer Lure');
        decisionMatrix.push({ indicator: 'Free Offer / Reward Bait Lure', weight: 20 });
      }
    } catch (e) {
      logger.warn(`[URL Parsing Warning] ${inputUrl}: ${e.message}`);
    }

    const contextPrompt = `
Analyze URL Security Threat: ${formattedUrl}
Hostname: ${hostname}
Detected Flags: ${flags.join(', ')}

Examine for:
- Fake Brand Impersonation
- Typosquatting
- HTTP (No SSL)
- Free Offer Lure
- Credential Harvesting
- Fake Login Page
- Unknown Domain
- Domain Reputation Low
`;

    const aiReport = await AIService.analyzeScamText(contextPrompt, 'URL');

    // Combine detected flags into AI report
    const mergedRedFlags = Array.from(new Set([...flags, ...(aiReport.redFlags || [])]));
    const mergedMatrix = [...decisionMatrix, ...(aiReport.decisionMatrix || [])];

    let dynamicCategory = aiReport.category;
    if (flags.includes('Fake Brand Impersonation (SBI Bank)') || flags.includes('Credential Harvesting')) {
      dynamicCategory = 'Fake Brand Impersonation & Phishing';
    } else if (flags.includes('Typosquatting')) {
      dynamicCategory = 'Typosquatting Scam';
    } else if (flags.includes('HTTP (No SSL)')) {
      dynamicCategory = 'Unsecured HTTP Phishing Link';
    } else if (flags.includes('Free Offer Lure')) {
      dynamicCategory = 'Fake Offer & Reward Scam';
    }

    return {
      url: formattedUrl,
      category: dynamicCategory,
      riskScore: Math.max(aiReport.riskScore || 85, flags.length > 0 ? 80 : 40),
      confidenceScore: aiReport.confidenceScore || 95,
      summary: aiReport.summary || `URL Security Analysis detected high-risk indicators including ${flags.join(', ')}.`,
      redFlags: mergedRedFlags,
      reasons: mergedRedFlags,
      decisionMatrix: mergedMatrix,
      recommendations: [
        'Do NOT enter passwords, OTPs, or financial details on this link.',
        'Check the browser address bar for valid SSL HTTPS encryption certificate.',
        'Verify the domain URL directly on official brand portals.'
      ],
      safetyTips: [
        'Phishing websites often use slight spelling misspellings (typosquatting) to impersonate trusted brands.',
        'Never trust unencrypted HTTP links asking for personal or banking credentials.'
      ]
    };
  }
}
