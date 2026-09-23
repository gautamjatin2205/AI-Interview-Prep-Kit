import axios from 'axios';

async function testFlows() {
  const baseURL = 'http://localhost:3000';
  console.log('--- TEST 1: Root / page access without auth ---');
  const rootRes = await axios.get(`${baseURL}/`, { maxRedirects: 0, validateStatus: () => true });
  console.log('Root GET status:', rootRes.status, '(Expect 200)');

  console.log('\n--- TEST 2: Register/Login Flow ---');
  // Register a test user
  const email = `testuser_${Date.now()}@example.com`;
  const password = 'Password123!';
  const regRes = await axios.post(`${baseURL}/api/auth/register`, {
    name: 'Test Candidate',
    email,
    password
  }, { validateStatus: () => true });
  console.log('Register status:', regRes.status, regRes.data);

  // Extract auth cookie
  const setCookie = regRes.headers['set-cookie'];
  const tokenCookie = setCookie ? setCookie.find(c => c.startsWith('token=')) : '';
  console.log('Got Auth Cookie:', Boolean(tokenCookie));

  const authHeaders = {
    headers: { Cookie: tokenCookie }
  };

  console.log('\n--- TEST 3: Authenticated access to root / (Create Kit) ---');
  const authRootRes = await axios.get(`${baseURL}/`, {
    ...authHeaders,
    maxRedirects: 0,
    validateStatus: () => true
  });
  console.log('Authenticated Root GET status:', authRootRes.status, '(Expect 200 - NO REDIRECT TO DASHBOARD!)');

  console.log('\n--- TEST 4: Fetch Kits from Dashboard API ---');
  const kitsRes = await axios.get(`${baseURL}/api/kits`, {
    ...authHeaders,
    validateStatus: () => true
  });
  console.log('Kits GET status:', kitsRes.status, 'Total kits returned:', kitsRes.data.kits?.length);

  console.log('\n--- TEST 5: Create New Kit (POST /api/kits) ---');
  const createRes = await axios.post(`${baseURL}/api/kits`, {
    jd: 'Senior Backend Engineer with 5+ years of Node.js, microservices, and Docker.',
    company_url: 'https://posthog.com',
    days: 5
  }, {
    ...authHeaders,
    validateStatus: () => true
  });
  console.log('Kit generation status:', createRes.status, 'Kit ID:', createRes.data.kit?.id);
  const createdKit = createRes.data.kit;

  if (createdKit) {
    const kitId = createdKit.id;

    console.log('\n--- TEST 6: Fetch Kit Details (/api/kits/[id]) ---');
    const getKitRes = await axios.get(`${baseURL}/api/kits/${kitId}`, {
      ...authHeaders,
      validateStatus: () => true
    });
    console.log('Get Kit status:', getKitRes.status, 'Questions count:', getKitRes.data.kit?.questions?.length);

    console.log('\n--- TEST 7: AI Hint Feature (/api/ai/hint) ---');
    const hintRes = await axios.post(`${baseURL}/api/ai/hint`, {
      question: createdKit.questions?.[0]?.prompt || 'Explain your backend architecture experience.',
      roleTitle: createdKit.role?.title || 'Senior Backend Engineer',
      company: 'PostHog',
      category: 'technical'
    }, {
      ...authHeaders,
      validateStatus: () => true
    });
    console.log('AI Hint status:', hintRes.status, 'Hint preview:', hintRes.data.hint?.slice(0, 100));

    console.log('\n--- TEST 8: AI Coach Chat Feature (/api/ai/chat) ---');
    const chatRes = await axios.post(`${baseURL}/api/ai/chat`, {
      kitId: kitId,
      message: 'What should I focus on for the technical interview?'
    }, {
      ...authHeaders,
      validateStatus: () => true
    });
    console.log('AI Chat status:', chatRes.status, 'Coach reply preview:', chatRes.data.reply?.slice(0, 100));

    console.log('\n--- TEST 9: AI Answer Evaluator Feature (/api/ai/evaluate) ---');
    const evalRes = await axios.post(`${baseURL}/api/ai/evaluate`, {
      question: createdKit.flashcards?.[0]?.front || 'What are microservices?',
      userAnswer: 'Microservices break down an application into independent services communicating via APIs.',
      category: 'technical',
      roleContext: 'Senior Backend Engineer'
    }, {
      ...authHeaders,
      validateStatus: () => true
    });
    console.log('AI Evaluator status:', evalRes.status, 'Score:', evalRes.data.evaluation?.score, 'Grade:', evalRes.data.evaluation?.grade);

    console.log('\n--- TEST 10: Practice State Submission (/api/practice/[id]) ---');
    const practiceRes = await axios.post(`${baseURL}/api/practice/${kitId}`, {
      cardId: createdKit.flashcards?.[0]?.id || 'f1',
      confidenceRating: 4
    }, {
      ...authHeaders,
      validateStatus: () => true
    });
    console.log('Practice Rating status:', practiceRes.status);
  }

  console.log('\n=======================================');
  console.log(' ALL END-TO-END FLOW TESTS COMPLETED!');
  console.log('=======================================');
}

testFlows().catch(console.error);
