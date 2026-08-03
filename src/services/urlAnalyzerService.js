import { URL } from 'url';
import { AIService } from './aiService.js';
import { logger } from '../utils/logger.js';

export class URLAnalyzerService {
  static async analyzeURL(inputUrl) {
    let formattedUrl = inputUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const officialDomains = [
      'flipkart.com', 'flipkart.in',
      'amazon.com', 'amazon.in',
      'google.com', 'google.co.in',
      'sbi.co.in', 'onlinesbi.sbi',
      'hdfcbank.com', 'icicibank.com',
      'paytm.com', 'whatsapp.com',
      'telegram.org', 't.me',
      'tcs.com', 'myntra.com',
      'meesho.com', 'swiggy.com', 'zomato.com',
      'apple.com', 'microsoft.com'
    ];

    let hostname = '';
    let isHttps = false;

    try {
      const parsed = new URL(formattedUrl);
      hostname = parsed.hostname.toLowerCase();
      isHttps = parsed.protocol === 'https:';
    } catch (e) {
      logger.warn(`[URL Parse Warning] ${inputUrl}: ${e.message}`);
    }

    const isOfficialLegitDomain = officialDomains.some(
      (d) => hostname === d || hostname.endsWith('.' + d)
    );

    // Whitelisted Official Authentic Domain Case
    if (isOfficialLegitDomain && isHttps) {
      return {
        url: formattedUrl,
        category: 'Legitimate Official Website',
        riskScore: 5,
        confidenceScore: 99,
        summary: `Verified Authentic Domain. The inspected URL (${hostname}) is an official, SSL-secured website belonging to a recognized brand. No phishing or typosquatting indicators found.`,
        detailedExplanation: `Verified Authentic Domain. The inspected URL (${hostname}) is an official, SSL-secured website belonging to a recognized brand. No phishing or typosquatting indicators found.`,
        redFlags: [],
        reasons: [],
        decisionMatrix: [
          { indicator: 'Verified Official Brand Domain Record', weight: 0 },
          { indicator: 'Valid HTTPS SSL Encryption', weight: 0 }
        ],
        recommendations: [
          'This URL belongs to the official verified website.',
          'Safe to browse, log in, and make purchases.'
        ],
        safetyTips: [
          'Always verify that the browser address bar displays the official domain name and https:// lock icon.'
        ]
      };
    }

    // Otherwise, perform full threat checks for suspicious or non-official links
    const flags = [];
    const decisionMatrix = [];
    let isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    const suspiciousTlds = ['.xyz', '.top', '.tk', '.online', '.site', '.club', '.work', '.info', '.biz', '.cc', '.ru', '.cf', '.ga', '.ml', '.gq'];
    let isSuspiciousTld = suspiciousTlds.some((tld) => hostname.endsWith(tld));

    if (!isHttps) {
      flags.push('HTTP (No SSL)');
      decisionMatrix.push({ indicator: 'HTTP (No SSL) Unencrypted Connection', weight: 25 });
    }
    if (isIpAddress) {
      flags.push('Unknown Domain / Raw IP');
      decisionMatrix.push({ indicator: 'Raw IP Hostname (No Domain Record)', weight: 35 });
    }
    if (isSuspiciousTld) {
      flags.push('Domain Reputation Low');
      flags.push('Suspicious TLD Extension');
      decisionMatrix.push({ indicator: 'Low Reputation TLD Extension', weight: 20 });
    }

    // Check for Typosquatting / Impersonation ONLY if not official domain
    const brandPatterns = [
      { brand: 'Amazon', regex: /amaz[o0]n|amzn/i, legit: ['amazon.com', 'amazon.in'] },
      { brand: 'SBI Bank', regex: /sbi|statebank/i, legit: ['sbi.co.in', 'onlinesbi.sbi'] },
      { brand: 'HDFC Bank', regex: /hdfc/i, legit: ['hdfcbank.com'] },
      { brand: 'ICICI Bank', regex: /icici/i, legit: ['icicibank.com'] },
      { brand: 'Paytm', regex: /paytm/i, legit: ['paytm.com'] },
      { brand: 'Google', regex: /g[o0]{2}gle/i, legit: ['google.com', 'google.co.in'] },
      { brand: 'WhatsApp', regex: /whatsa?pp/i, legit: ['whatsapp.com'] },
      { brand: 'Telegram', regex: /telegr?am/i, legit: ['telegram.org', 't.me'] },
      { brand: 'Flipkart', regex: /flipkart/i, legit: ['flipkart.com', 'flipkart.in'] }
    ];

    brandPatterns.forEach(({ brand, regex, legit }) => {
      const isLegit = legit.some((l) => hostname === l || hostname.endsWith('.' + l));
      if (regex.test(hostname) && !isLegit) {
        flags.push(`Fake Brand Impersonation (${brand})`);
        flags.push('Typosquatting');
        decisionMatrix.push({ indicator: `Typosquatting / ${brand} Impersonation`, weight: 30 });
      }
    });

    const fullPath = formattedUrl.toLowerCase();
    if (/login|signin|verify|account|pass|kyc|update|auth/i.test(fullPath) && !isOfficialLegitDomain) {
      flags.push('Credential Harvesting');
      flags.push('Fake Login Page');
      decisionMatrix.push({ indicator: 'Credential Harvesting Login Lure', weight: 25 });
    }

    if (/free|reward|claim|bonus|gift|dhamaka|cashback|win|lucky/i.test(fullPath) && !isOfficialLegitDomain) {
      flags.push('Free Offer Lure');
      decisionMatrix.push({ indicator: 'Free Offer / Reward Bait Lure', weight: 20 });
    }

    const contextPrompt = `
Analyze URL Security Threat: ${formattedUrl}
Hostname: ${hostname}
Detected Flags: ${flags.join(', ')}
`;

    const aiReport = await AIService.analyzeScamText(contextPrompt, 'URL');
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
      riskScore: Math.max(aiReport.riskScore || 85, flags.length > 0 ? 80 : 20),
      confidenceScore: aiReport.confidenceScore || 95,
      summary: aiReport.summary || `URL Security Analysis detected threat indicators: ${flags.join(', ')}.`,
      detailedExplanation: aiReport.detailedExplanation || `URL Security Analysis detected threat indicators: ${flags.join(', ')}.`,
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
