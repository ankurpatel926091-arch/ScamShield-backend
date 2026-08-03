import app from '../src/app.js';

console.log('[Test Suite] Running ScamShield AI Automated Integration Tests...');

const runTests = async () => {
  let passed = 0;
  let failed = 0;

  // Test 1: Config and App defined
  if (app) {
    console.log('✔ Test 1 Passed: Express Application initialized cleanly.');
    passed++;
  } else {
    console.error('❌ Test 1 Failed: Express app is null.');
    failed++;
  }

  // Test 2: AI Heuristic Fallback Analysis
  const { AIService } = await import('../src/services/aiService.js');
  const result = AIService.heuristicScamAnalysis('Telegram part time job rating deposit ₹5000', 'Text');

  if (result && result.riskScore >= 60 && result.category === 'Fake Job') {
    console.log(`✔ Test 2 Passed: AI Heuristic threat detection correctly identified "${result.category}" with Risk Score ${result.riskScore}/100.`);
    passed++;
  } else {
    console.error('❌ Test 2 Failed: AI Heuristic output unexpected', result);
    failed++;
  }

  // Test 3: URL Security Auditor
  const { URLAnalyzerService } = await import('../src/services/urlAnalyzerService.js');
  const urlReport = await URLAnalyzerService.analyzeURL('http://192.168.1.1/login.xyz');

  if (urlReport && urlReport.riskScore >= 75 && urlReport.urlChecks.isIpAddress) {
    console.log(`✔ Test 3 Passed: URL Security auditor correctly flagged insecure IP URL with Risk Score ${urlReport.riskScore}/100.`);
    passed++;
  } else {
    console.error('❌ Test 3 Failed: URL Security Auditor output unexpected', urlReport);
    failed++;
  }

  console.log(`\n====================================`);
  console.log(`Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`====================================`);

  if (failed > 0) process.exit(1);
};

runTests().catch(err => {
  console.error('Test runner exception:', err);
  process.exit(1);
});
