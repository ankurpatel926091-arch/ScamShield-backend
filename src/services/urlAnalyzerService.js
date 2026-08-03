import { URL } from 'url';
import { AIService } from './aiService.js';
import { logger } from '../utils/logger.js';

export class URLAnalyzerService {
  static async analyzeURL(inputUrl) {
    let formattedUrl = inputUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const checks = {
      isHttps: false,
      isIpAddress: false,
      suspiciousTld: false,
      suspiciousKeywords: [],
      hostname: '',
      protocol: ''
    };

    try {
      const parsed = new URL(formattedUrl);
      checks.hostname = parsed.hostname;
      checks.protocol = parsed.protocol;
      checks.isHttps = parsed.protocol === 'https:';

      // IP check
      checks.isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(parsed.hostname);

      // Suspicious TLD check
      const suspiciousTlds = ['.xyz', '.top', '.tk', '.online', '.site', '.club', '.work', '.info', '.biz', '.cc', '.ru'];
      checks.suspiciousTld = suspiciousTlds.some(tld => parsed.hostname.endsWith(tld));

      // Keywords check in hostname/pathname
      const fullUrlLower = formattedUrl.toLowerCase();
      const keywords = ['login', 'verify', 'update', 'banking', 'secure', 'free', 'reward', 'claim', 'wallet', 'crypto', 'support', 'telegram', 'apk'];
      keywords.forEach(kw => {
        if (fullUrlLower.includes(kw)) {
          checks.suspiciousKeywords.push(kw);
        }
      });
    } catch (e) {
      logger.warn(`URL parse failed for ${inputUrl}`);
    }

    // Pass URL string + analysis indicators to Gemini AI for complete report
    const contextPrompt = `URL to inspect: ${formattedUrl}. Hostname: ${checks.hostname}. Is HTTPS: ${checks.isHttps}. Is IP address: ${checks.isIpAddress}. Suspicious TLD: ${checks.suspiciousTld}. Keywords: ${checks.suspiciousKeywords.join(', ')}.`;

    const aiReport = await AIService.analyzeScamText(contextPrompt, 'URL');

    // Elevate risk score if non-HTTPS or IP address
    if (!checks.isHttps) {
      aiReport.riskScore = Math.max(aiReport.riskScore, 75);
      aiReport.reasons.unshift('URL uses insecure HTTP protocol instead of HTTPS');
    }
    if (checks.isIpAddress) {
      aiReport.riskScore = Math.max(aiReport.riskScore, 90);
      aiReport.reasons.unshift('URL points directly to a raw IP address');
    }
    if (checks.suspiciousTld) {
      aiReport.riskScore = Math.max(aiReport.riskScore, 70);
      aiReport.reasons.unshift(`Domain uses high-risk suspicious TLD`);
    }

    return {
      url: formattedUrl,
      urlChecks: checks,
      ...aiReport
    };
  }
}
