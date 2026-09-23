import 'dotenv/config';
import assert from 'assert';
import { allocateSchedule, runCoverageCheckAndSecondPass, generateInterviewKit } from '../services/pipeline/index.js';

console.log('=======================================================');
console.log(' AUTOMATED PIPELINE TEST SUITE (Trao Assessment)');
console.log('=======================================================\n');

function testArithmeticScheduler() {
  console.log('[Test 1] Testing Code-Driven Arithmetic Scheduler (Section 3 & 8)...');

  const mockReqs = [
    { id: 'r1', text: '5+ years Node.js', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'React & Next.js', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'Communication skills', kind: 'behavioural', priority: 'nice' }
  ];

  const mockQuestions = [
    { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Node.js event loop', difficulty: 3 },
    { id: 'q2', requirement_ids: ['r2'], category: 'technical', prompt: 'Next.js SSR', difficulty: 2 },
    { id: 'q3', requirement_ids: ['r3'], category: 'behavioural', prompt: 'Team conflict', difficulty: 1 }
  ];

  const result = allocateSchedule(mockQuestions, mockReqs, 3);

  assert.strictEqual(result.days_available, 3, 'Days available must equal requested days');
  assert.strictEqual(result.days.length, 3, 'Days array length must equal requested days');

  result.days.forEach(d => {
    assert.strictEqual(Number.isInteger(d.minutes), true, `Day ${d.day} minutes must be integer`);
    assert.strictEqual(typeof d.focus, 'string', `Day ${d.day} focus must be string`);
  });

  // Verify harder/must question (q1 diff 3) lands on earlier day (Day 1)
  assert.strictEqual(result.days[0].question_ids.includes('q1'), true, 'Harder/must-have question q1 must land on Day 1');

  console.log('  -> PASS: Arithmetic Scheduler satisfies all rules!\n');
}

function testCoverageCheckAndSecondPass() {
  console.log('[Test 2] Testing Second Pass Coverage Checker (Section 4)...');

  const mockReqs = [
    { id: 'r1', text: 'Must-have requirement 1', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Must-have requirement 2 (uncovered gap!)', kind: 'technical', priority: 'must' }
  ];

  // Only q1 covers r1; r2 is intentionally missing!
  const initialQuestions = [
    { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Question on r1', difficulty: 2 }
  ];

  const result = runCoverageCheckAndSecondPass(mockReqs, initialQuestions);

  assert.strictEqual(result.coverage.passes, 2, 'Must execute Second Pass when gap must-have requirements exist');
  assert.strictEqual(result.questions.length > initialQuestions.length, true, 'Second pass must generate missing questions');

  // Verify missing requirement r2 is now covered
  const coveredIds = new Set();
  result.questions.forEach(q => (q.requirement_ids || []).forEach(rid => coveredIds.add(rid)));
  assert.strictEqual(coveredIds.has('r2'), true, 'Second pass must eliminate gap requirement r2');

  console.log('  -> PASS: Second Pass Coverage Check successfully eliminated gaps!\n');
}

async function testFullPipelineAndSchema() {
  console.log('[Test 3] Testing Full Pipeline & Appendix A Schema Compliance...');

  const kit = await generateInterviewKit({
    jd: 'Senior Backend Engineer\n5+ years Node.js and MongoDB experience required. Microservices architecture.',
    company_url: 'https://posthog.com',
    days: 5,
    userId: 'test_runner'
  });

  assert.ok(kit.source, 'Must have source object');
  assert.ok(kit.company_brief, 'Must have company_brief object');
  assert.ok(kit.role, 'Must have role object');
  assert.ok(Array.isArray(kit.questions), 'questions must be an array');
  assert.ok(Array.isArray(kit.flashcards), 'flashcards must be an array');
  assert.ok(kit.schedule, 'Must have schedule object');
  assert.ok(kit.coverage, 'Must have coverage object');

  assert.strictEqual(kit.schedule.days_available, 5);
  assert.strictEqual(kit.schedule.days.length, 5);

  console.log('  -> PASS: Full pipeline output complies 100% with Appendix A Schema!\n');
}

async function runAllTests() {
  try {
    testArithmeticScheduler();
    testCoverageCheckAndSecondPass();
    await testFullPipelineAndSchema();

    console.log('=======================================================');
    console.log(' ALL AUTOMATED PIPELINE TESTS PASSED (100% SUCCESS)');
    console.log('=======================================================\n');
  } catch (err) {
    console.error('\nTest failure error:', err);
    process.exit(1);
  }
}

runAllTests();
