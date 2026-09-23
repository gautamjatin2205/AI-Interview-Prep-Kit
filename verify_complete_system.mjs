import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const baseURL = 'http://localhost:3000';

const results = {
  database: [],
  backend: [],
  ai: [],
  frontend: []
};

function recordResult(category, testName, passed, details = '') {
  results[category].push({ testName, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${category.toUpperCase()}] ${testName} ${details ? '(' + details + ')' : ''}`);
}

async function runComprehensiveCheck() {
  console.log('\n===============================================================');
  console.log(' STARTING FULL SYSTEM AUDIT: FRONTEND, BACKEND, DB & AI');
  console.log('===============================================================\n');

  // ─────────────────────────────────────────────────────────────
  // 1. DATABASE CHECKS
  // ─────────────────────────────────────────────────────────────
  console.log('--- 1. DATABASE CONNECTIVITY & OPERATIONS ---');
  try {
    const { connectDB } = await import('./src/lib/db.js');
    const isConnected = await connectDB();
    recordResult('database', 'MongoDB Cluster Connection', isConnected === true, isConnected ? 'Connected to live cluster' : 'Using FileDB fallback');
  } catch (err) {
    recordResult('database', 'MongoDB Cluster Connection', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. BACKEND AUTHENTICATION APIS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. BACKEND AUTHENTICATION APIS ---');
  const testEmail = `tester_${Date.now()}@example.com`;
  const testPassword = 'SecurePassword2026!';
  let authCookie = '';

  // Register
  try {
    const regRes = await axios.post(`${baseURL}/api/auth/register`, {
      name: 'Diagnostic Tester',
      email: testEmail,
      password: testPassword
    }, { validateStatus: () => true });

    const ok = regRes.status === 201 || regRes.status === 200;
    recordResult('backend', 'POST /api/auth/register (User Registration)', ok, `Status ${regRes.status}`);

    const setCookie = regRes.headers['set-cookie'];
    if (setCookie) {
      authCookie = setCookie.find(c => c.startsWith('token='));
    }
  } catch (err) {
    recordResult('backend', 'POST /api/auth/register (User Registration)', false, err.message);
  }

  // Login
  try {
    const loginRes = await axios.post(`${baseURL}/api/auth/login`, {
      email: testEmail,
      password: testPassword
    }, { validateStatus: () => true });

    const ok = loginRes.status === 200 && loginRes.data?.success;
    recordResult('backend', 'POST /api/auth/login (User Authentication)', ok, `Status ${loginRes.status}`);

    const setCookie = loginRes.headers['set-cookie'];
    if (setCookie && !authCookie) {
      authCookie = setCookie.find(c => c.startsWith('token='));
    }
  } catch (err) {
    recordResult('backend', 'POST /api/auth/login (User Authentication)', false, err.message);
  }

  const authHeaders = authCookie ? { headers: { Cookie: authCookie } } : {};

  // Auth Me
  try {
    const meRes = await axios.get(`${baseURL}/api/auth/me`, { ...authHeaders, validateStatus: () => true });
    const ok = meRes.status === 200 && meRes.data?.user?.email === testEmail.toLowerCase();
    recordResult('backend', 'GET /api/auth/me (JWT Session Verification)', ok, `User: ${meRes.data?.user?.email}`);
  } catch (err) {
    recordResult('backend', 'GET /api/auth/me (JWT Session Verification)', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. BACKEND KITS & PIPELINE GENERATION
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 3. BACKEND KITS & PIPELINE GENERATION ---');
  let testKitId = null;
  let testKit = null;

  // GET kits list
  try {
    const kitsRes = await axios.get(`${baseURL}/api/kits`, { ...authHeaders, validateStatus: () => true });
    const ok = kitsRes.status === 200 && Array.isArray(kitsRes.data?.kits);
    recordResult('backend', 'GET /api/kits (Fetch User Kits)', ok, `Count: ${kitsRes.data?.kits?.length}`);
  } catch (err) {
    recordResult('backend', 'GET /api/kits (Fetch User Kits)', false, err.message);
  }

  // POST /api/kits (Creation via Pipeline + AI)
  console.log('Generating test kit (Crawl + AI Extraction + Schedule)...');
  try {
    const createRes = await axios.post(`${baseURL}/api/kits`, {
      jd: `Full Stack Engineer (TypeScript, React, Node.js)
Must have 4+ years building high scale APIs with Node.js and MongoDB.
Experience with Next.js and TailwindCSS required.
Bonus: Experience leading sprint planning and cross-functional teams.`,
      company_url: 'https://posthog.com',
      days: 3
    }, { ...authHeaders, timeout: 60000, validateStatus: () => true });

    const ok = (createRes.status === 200 || createRes.status === 201) && Boolean(createRes.data?.kit?.id);
    testKit = createRes.data?.kit;
    testKitId = testKit?.id;
    recordResult('backend', 'POST /api/kits (Kit Generation Pipeline)', ok, `Kit ID: ${testKitId}, Questions: ${testKit?.questions?.length}`);
  } catch (err) {
    recordResult('backend', 'POST /api/kits (Kit Generation Pipeline)', false, err.message);
  }

  if (testKitId) {
    // GET /api/kits/[id]
    try {
      const getKitRes = await axios.get(`${baseURL}/api/kits/${testKitId}`, { ...authHeaders, validateStatus: () => true });
      const ok = getKitRes.status === 200 && getKitRes.data?.kit?.id === testKitId;
      recordResult('backend', 'GET /api/kits/[id] (Kit Retrieval)', ok, `Schedule Days: ${getKitRes.data?.kit?.schedule?.days?.length}`);
    } catch (err) {
      recordResult('backend', 'GET /api/kits/[id] (Kit Retrieval)', false, err.message);
    }

    // PUT /api/kits/[id] (Manual edit / pin update)
    try {
      const updateData = { ...testKit, title: 'Updated Engineering Kit' };
      const putRes = await axios.put(`${baseURL}/api/kits/${testKitId}`, updateData, { ...authHeaders, validateStatus: () => true });
      const ok = putRes.status === 200 && putRes.data?.success;
      recordResult('backend', 'PUT /api/kits/[id] (Update Kit / Custom Edits)', ok, `Status ${putRes.status}`);
    } catch (err) {
      recordResult('backend', 'PUT /api/kits/[id] (Update Kit / Custom Edits)', false, err.message);
    }

    // POST /api/kits/[id]/regenerate (Regenerate single target)
    try {
      const regenRes = await axios.post(`${baseURL}/api/kits/${testKitId}/regenerate`, {
        target: 'schedule'
      }, { ...authHeaders, validateStatus: () => true });
      const ok = regenRes.status === 200 && regenRes.data?.success;
      recordResult('backend', 'POST /api/kits/[id]/regenerate (Schedule Regeneration)', ok, `Status ${regenRes.status}`);
    } catch (err) {
      recordResult('backend', 'POST /api/kits/[id]/regenerate (Schedule Regeneration)', false, err.message);
    }

    // Practice Deck endpoints
    try {
      const getPracticeRes = await axios.get(`${baseURL}/api/practice/${testKitId}`, { ...authHeaders, validateStatus: () => true });
      const ok = getPracticeRes.status === 200 && Array.isArray(getPracticeRes.data?.flashcards);
      recordResult('backend', 'GET /api/practice/[id] (Fetch Practice Cards)', ok, `Flashcards: ${getPracticeRes.data?.flashcards?.length}`);
    } catch (err) {
      recordResult('backend', 'GET /api/practice/[id] (Fetch Practice Cards)', false, err.message);
    }

    try {
      const postPracticeRes = await axios.post(`${baseURL}/api/practice/${testKitId}`, {
        cardId: testKit.flashcards?.[0]?.id || 'f1',
        confidenceRating: 5
      }, { ...authHeaders, validateStatus: () => true });
      const ok = postPracticeRes.status === 200 && postPracticeRes.data?.success;
      recordResult('database', 'POST /api/practice/[id] (Save Confidence Rating State)', ok, `Success: ${ok}`);
    } catch (err) {
      recordResult('database', 'POST /api/practice/[id] (Save Confidence Rating State)', false, err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 4. AI CAPABILITIES
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 4. AI FEATURES & CAPABILITIES ---');

  // AI Hint
  try {
    const hintRes = await axios.post(`${baseURL}/api/ai/hint`, {
      question: 'How do you design a scalable event-driven architecture using Node.js and MongoDB?',
      roleTitle: 'Full Stack Engineer',
      company: 'PostHog',
      category: 'technical'
    }, { ...authHeaders, timeout: 25000, validateStatus: () => true });

    const ok = hintRes.status === 200 && Boolean(hintRes.data?.hint && hintRes.data.hint.length > 20);
    recordResult('ai', 'POST /api/ai/hint (AI Question Hint Generation)', ok, `Hint length: ${hintRes.data?.hint?.length} chars`);
  } catch (err) {
    recordResult('ai', 'POST /api/ai/hint (AI Question Hint Generation)', false, err.message);
  }

  await new Promise(r => setTimeout(r, 1000));

  // AI Chat / Coach
  try {
    const chatRes = await axios.post(`${baseURL}/api/ai/chat`, {
      kitId: testKitId,
      message: 'Can you give me a 3-point study checklist for MongoDB indexing?'
    }, { ...authHeaders, timeout: 25000, validateStatus: () => true });

    const ok = chatRes.status === 200 && Boolean(chatRes.data?.reply && chatRes.data.reply.length > 20);
    recordResult('ai', 'POST /api/ai/chat (Interactive AI Interview Coach)', ok, `Reply length: ${chatRes.data?.reply?.length} chars`);
  } catch (err) {
    recordResult('ai', 'POST /api/ai/chat (Interactive AI Interview Coach)', false, err.message);
  }

  await new Promise(r => setTimeout(r, 1000));

  // AI Answer Evaluator
  try {
    const evalRes = await axios.post(`${baseURL}/api/ai/evaluate`, {
      question: 'Explain the difference between SQL and NoSQL and when to choose MongoDB.',
      userAnswer: 'SQL is relational with fixed schemas and ACID transactions across tables. MongoDB is document-based, flexible for unstructured schema, and scales horizontally through sharding.',
      category: 'technical',
      roleContext: 'Full Stack Engineer at PostHog'
    }, { ...authHeaders, timeout: 25000, validateStatus: () => true });

    const evalData = evalRes.data?.evaluation;
    const ok = evalRes.status === 200 && evalData && typeof evalData.score === 'number';
    recordResult('ai', 'POST /api/ai/evaluate (AI Candidate Answer Evaluator)', ok, `Score: ${evalData?.score}/10, Grade: ${evalData?.grade}`);
  } catch (err) {
    recordResult('ai', 'POST /api/ai/evaluate (AI Candidate Answer Evaluator)', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 5. FRONTEND PAGE RENDERS (SSR / Client Views)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 5. FRONTEND ROUTE RENDERS ---');

  const pagesToTest = [
    { path: '/', name: 'Landing / Kit Generator Page' },
    { path: '/login', name: 'Login Page' },
    { path: '/register', name: 'Registration Page' },
    { path: '/dashboard', name: 'Candidate Dashboard' }
  ];

  if (testKitId) {
    pagesToTest.push({ path: `/kit/${testKitId}`, name: 'Kit Detail View' });
    pagesToTest.push({ path: `/practice/${testKitId}`, name: 'Flashcard Practice Interface' });
  }

  for (const page of pagesToTest) {
    try {
      const pageRes = await axios.get(`${baseURL}${page.path}`, {
        ...authHeaders,
        validateStatus: () => true
      });
      const ok = pageRes.status === 200 && pageRes.data?.includes('<!DOCTYPE html>');
      recordResult('frontend', `GET ${page.path} (${page.name})`, ok, `HTTP ${pageRes.status}`);
    } catch (err) {
      recordResult('frontend', `GET ${page.path} (${page.name})`, false, err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SUMMARY REPORT
  // ─────────────────────────────────────────────────────────────
  console.log('\n===============================================================');
  console.log(' SYSTEM VERIFICATION SUMMARY');
  console.log('===============================================================');

  let totalTests = 0;
  let passedTests = 0;

  for (const cat of ['database', 'backend', 'ai', 'frontend']) {
    const list = results[cat];
    const catPassed = list.filter(t => t.passed).length;
    totalTests += list.length;
    passedTests += catPassed;
    const status = catPassed === list.length ? '100% OPERATIONAL' : `${catPassed}/${list.length} PASSED`;
    console.log(`• ${cat.toUpperCase()}: ${status}`);
  }

  console.log(`\nTOTAL: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('===============================================================\n');
}

runComprehensiveCheck().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
