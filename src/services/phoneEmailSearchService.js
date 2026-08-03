import { ScamDatabase } from '../models/ScamDatabase.js';
import { ScamReport } from '../models/ScamReport.js';

export class PhoneEmailSearchService {
  static async searchPhoneNumber(phoneNumber) {
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');

    const dbRecord = await ScamDatabase.findOne({ identifier: cleanNumber, type: 'phone' });

    const relatedReports = await ScamReport.find({
      'scammerDetails.phone': { $regex: cleanNumber, $options: 'i' }
    })
      .populate('reporter', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(10);

    const totalReports = relatedReports.length + (dbRecord?.totalReports || 0);

    let riskScore = 15;
    if (totalReports > 0) riskScore = 85;
    if (dbRecord?.verifiedScam) riskScore = 98;

    return {
      query: cleanNumber,
      type: 'phone',
      found: totalReports > 0,
      totalReports,
      verifiedScam: dbRecord?.verifiedScam || totalReports >= 3,
      riskScore,
      categories: dbRecord?.categories || [...new Set(relatedReports.map(r => r.category))],
      latestReports: relatedReports
    };
  }

  static async searchEmail(emailAddress) {
    const cleanEmail = emailAddress.trim().toLowerCase();

    const dbRecord = await ScamDatabase.findOne({ identifier: cleanEmail, type: 'email' });

    const relatedReports = await ScamReport.find({
      'scammerDetails.email': cleanEmail
    })
      .populate('reporter', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(10);

    const totalReports = relatedReports.length + (dbRecord?.totalReports || 0);

    let riskScore = 10;
    if (totalReports > 0) riskScore = 80;
    if (dbRecord?.verifiedScam) riskScore = 95;

    return {
      query: cleanEmail,
      type: 'email',
      found: totalReports > 0,
      totalReports,
      verifiedScam: dbRecord?.verifiedScam || totalReports >= 3,
      riskScore,
      categories: dbRecord?.categories || [...new Set(relatedReports.map(r => r.category))],
      latestReports: relatedReports
    };
  }
}
