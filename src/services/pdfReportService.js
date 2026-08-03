import PDFDocument from 'pdfkit';

export const generatePDFReport = (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header Banner
      doc.fillColor('#06b6d4').fontSize(22).text('🛡️ ScamShield AI - Scam Audit Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fillColor('#64748b').fontSize(10).text(`Generated: ${new Date().toLocaleString()} | ID: ${reportData.id || 'SCAN-TEMP'}`, { align: 'center' });
      doc.moveDown(1.5);

      // Risk Score & Category Box
      doc.fillColor('#0f172a').rect(40, doc.y, 532, 70).fill();
      const boxY = doc.y - 70;

      doc.fillColor('#38bdf8').fontSize(14).text(`Risk Score: ${reportData.riskScore || 50}/100`, 55, boxY + 15);
      doc.fillColor('#f8fafc').fontSize(12).text(`Category: ${reportData.category || 'Fraud Threat'}`, 55, boxY + 38);
      doc.fillColor('#a855f7').fontSize(12).text(`Confidence: ${reportData.confidenceScore || 85}%`, 380, boxY + 15);
      
      doc.moveDown(2);

      // Red Flags Section
      doc.fillColor('#ef4444').fontSize(14).text('Detected Red Flags & Reasons');
      doc.moveDown(0.5);
      doc.fillColor('#334155').fontSize(10);
      (reportData.reasons || []).forEach((reason, i) => {
        doc.text(`  • ${reason}`);
      });
      doc.moveDown(1);

      // Explanation Section
      doc.fillColor('#0284c7').fontSize(14).text('Detailed AI Analysis');
      doc.moveDown(0.5);
      doc.fillColor('#1e293b').fontSize(10).text(reportData.detailedExplanation || 'No detailed explanation provided.', { lineGap: 3 });
      doc.moveDown(1);

      // Safety Recommendations
      doc.fillColor('#10b981').fontSize(14).text('Safety Recommendations');
      doc.moveDown(0.5);
      doc.fillColor('#334155').fontSize(10);
      (reportData.safetyTips || []).forEach((tip) => {
        doc.text(`  ✔ ${tip}`);
      });
      doc.moveDown(1.5);

      // Footer
      doc.fontSize(8).fillColor('#94a3b8').text('ScamShield AI Platform - Official Automated Threat Report. For assistance visit cybercrime.gov.in', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
