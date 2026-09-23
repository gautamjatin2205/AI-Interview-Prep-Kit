import axios from 'axios';

// ============================================================================
// RETRY HELPER — exponential backoff for rate-limits across all providers
// ============================================================================
async function withRetry(fn, maxRetries = 3) {
  let delay = 1000;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.response?.status;
      const isRateLimit = status === 429 || status === 503;
      if (isRateLimit && attempt < maxRetries) {
        console.warn(`[LLM] Rate limited (${status}). Backing off for ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      } else {
        throw err;
      }
    }
  }
}

// ============================================================================
// PROVIDER: GEMINI (gemini-flash-latest with gemini-flash-lite-latest fallback)
// ============================================================================
async function callGeminiJSON(prompt, systemPrompt = '') {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey.trim() === '') return null;

  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n${prompt}\n\nRespond with valid JSON only. No markdown, no code fences, no explanation.`
    : `${prompt}\n\nRespond with valid JSON only. No markdown, no code fences, no explanation.`;

  return withRetry(async () => {
    console.log('[LLM] Calling Gemini Flash (JSON)...');
    try {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
        {
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json'
          }
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 25000 }
      );
      const raw = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      // Fallback to flash-lite if needed
      console.warn('[LLM] Trying Gemini Flash Lite fallback...');
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${geminiKey}`,
        {
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json'
          }
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 25000 }
      );
      const raw = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      return JSON.parse(cleaned);
    }
  }, 3);
}

async function callGeminiText(prompt, systemPrompt = '') {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey.trim() === '') return null;

  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  return withRetry(async () => {
    console.log('[LLM] Calling Gemini Flash (text)...');
    try {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
        {
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 1024 }
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 20000 }
      );
      return res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } catch (err) {
      console.warn('[LLM] Trying Gemini Flash Lite text fallback...');
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${geminiKey}`,
        {
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 1024 }
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 20000 }
      );
      return res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    }
  }, 3);
}

// ============================================================================
// PROVIDER: GROQ (llama3-70b)
// ============================================================================
async function callGroqJSON(prompt, systemPrompt = '') {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey || groqKey.trim() === '') return null;

  return withRetry(async () => {
    console.log('[LLM] Calling Groq Llama3...');
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama3-70b-8192',
      messages: [
        { role: 'system', content: systemPrompt || 'You are a helpful assistant. Respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    }, {
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      timeout: 20000
    });
    return JSON.parse(res.data.choices[0].message.content);
  }, 3);
}

async function callGroqText(prompt, systemPrompt = '') {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey || groqKey.trim() === '') return null;

  return withRetry(async () => {
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama3-70b-8192',
      messages: [
        { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ]
    }, {
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      timeout: 15000
    });
    return res.data.choices[0].message.content?.trim() || '';
  }, 3);
}

// ============================================================================
// PROVIDER: OPENAI (gpt-4o-mini)
// ============================================================================
async function callOpenAIJSON(prompt, systemPrompt = '') {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey || openaiKey.trim() === '') return null;

  return withRetry(async () => {
    console.log('[LLM] Calling OpenAI gpt-4o-mini...');
    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt || 'You are a helpful assistant. Respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    }, {
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      timeout: 20000
    });
    return JSON.parse(res.data.choices[0].message.content);
  }, 3);
}

async function callOpenAIText(prompt, systemPrompt = '') {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey || openaiKey.trim() === '') return null;

  return withRetry(async () => {
    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ]
    }, {
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      timeout: 15000
    });
    return res.data.choices[0].message.content?.trim() || '';
  }, 3);
}

// ============================================================================
// PUBLIC API: callLLM — JSON mode (waterfall: Gemini → Groq → OpenAI)
// ============================================================================
export async function callLLM(prompt, systemPrompt = '') {
  const provider = process.env.LLM_PROVIDER || 'auto';

  if (provider === 'gemini' || provider === 'auto') {
    const result = await callGeminiJSON(prompt, systemPrompt).catch(e => {
      console.warn('[LLM] Gemini JSON failed:', e.message);
      return null;
    });
    if (result) return result;
  }

  if (provider === 'groq' || provider === 'auto') {
    const result = await callGroqJSON(prompt, systemPrompt).catch(e => {
      console.warn('[LLM] Groq JSON failed:', e.message);
      return null;
    });
    if (result) return result;
  }

  if (provider === 'openai' || provider === 'auto') {
    const result = await callOpenAIJSON(prompt, systemPrompt).catch(e => {
      console.warn('[LLM] OpenAI JSON failed:', e.message);
      return null;
    });
    if (result) return result;
  }

  return null;
}

// ============================================================================
// PUBLIC API: callLLMText — text mode (for chat, hints, evaluation)
// ============================================================================
export async function callLLMText(prompt, systemPrompt = '') {
  const provider = process.env.LLM_PROVIDER || 'auto';

  if (provider === 'gemini' || provider === 'auto') {
    const result = await callGeminiText(prompt, systemPrompt).catch(e => {
      console.warn('[LLM] Gemini text failed:', e.message);
      return null;
    });
    if (result) return result;
  }

  if (provider === 'groq' || provider === 'auto') {
    const result = await callGroqText(prompt, systemPrompt).catch(e => {
      console.warn('[LLM] Groq text failed:', e.message);
      return null;
    });
    if (result) return result;
  }

  if (provider === 'openai' || provider === 'auto') {
    const result = await callOpenAIText(prompt, systemPrompt).catch(e => {
      console.warn('[LLM] OpenAI text failed:', e.message);
      return null;
    });
    if (result) return result;
  }

  return null;
}

// ============================================================================
// FALLBACK: Rule-based heuristic kit generator (no LLM key configured)
// ============================================================================
function generateFallbackKit({ jd, companyUrl, companyBrief, days }) {
  console.log('[LLM] Generating kit via Heuristic Engine (no API key)...');

  const cleanJd = jd || '';
  const lines = cleanJd.split('\n').map(l => l.trim()).filter(l => l.length > 5);

  const requirements = [];
  let reqCounter = 1;

  const techKeywords = ['react', 'node', 'javascript', 'typescript', 'python', 'java', 'aws', 'sql', 'mongodb', 'docker', 'api', 'system design', 'microservices', 'git', 'ci/cd', 'frontend', 'backend', 'fullstack', 'css', 'html', 'rest'];
  const behaviouralKeywords = ['lead', 'mentoring', 'communication', 'teamwork', 'agile', 'scrum', 'collaboration', 'stakeholder', 'ownership'];

  lines.forEach(line => {
    const lower = line.toLowerCase();
    const isMust = lower.includes('require') || lower.includes('must') || lower.includes('years') || lower.includes('experience') || lower.includes('strong') || lower.includes('expert');
    const isNice = lower.includes('bonus') || lower.includes('plus') || lower.includes('nice to have') || lower.includes('preferred');

    if (isMust || isNice || reqCounter <= 5) {
      let kind = 'domain';
      if (techKeywords.some(k => lower.includes(k))) kind = 'technical';
      else if (behaviouralKeywords.some(k => lower.includes(k))) kind = 'behavioural';

      requirements.push({
        id: `r${reqCounter}`,
        text: line.length > 120 ? line.slice(0, 120) + '...' : line,
        kind: kind,
        priority: isNice ? 'nice' : 'must'
      });
      reqCounter++;
    }
  });

  if (requirements.length === 0) {
    requirements.push(
      { id: 'r1', text: 'Core technical competency in position stack', kind: 'technical', priority: 'must' },
      { id: 'r2', text: 'Problem solving and system architecture skills', kind: 'technical', priority: 'must' },
      { id: 'r3', text: 'Effective communication and team collaboration', kind: 'behavioural', priority: 'nice' }
    );
  }

  const questions = [];
  let qCounter = 1;

  requirements.forEach(req => {
    if (req.kind === 'technical') {
      questions.push({
        id: `q${qCounter++}`,
        requirement_ids: [req.id],
        category: 'technical',
        prompt: `Explain your experience with: "${req.text}". What architectural decisions and trade-offs did you make?`,
        answer_outline: `1. Define key concepts related to ${req.text}.\n2. Detail a real-world project example.\n3. Discuss edge cases, scalability, and error handling.`,
        difficulty: 2
      });
      questions.push({
        id: `q${qCounter++}`,
        requirement_ids: [req.id],
        category: 'system-design',
        prompt: `How would you design a scalable production service incorporating ${req.text}?`,
        answer_outline: `1. High-level architecture and components.\n2. Data model, API contracts, and storage choices.\n3. Bottlenecks, caching, and load balancing strategies.`,
        difficulty: 3
      });
    } else if (req.kind === 'behavioural') {
      questions.push({
        id: `q${qCounter++}`,
        requirement_ids: [req.id],
        category: 'behavioural',
        prompt: `Describe a scenario where you demonstrated: "${req.text}". What was the outcome?`,
        answer_outline: `STAR Method:\n- Situation: Context of the challenge.\n- Task: Your specific responsibility.\n- Action: Steps you personally executed.\n- Result: Measurable impact and learning.`,
        difficulty: 2
      });
    } else {
      questions.push({
        id: `q${qCounter++}`,
        requirement_ids: [req.id],
        category: 'company-fit',
        prompt: `Why are you interested in joining ${companyBrief?.company_name || 'this company'} and how does your background in "${req.text}" align with our mission?`,
        answer_outline: `1. Align personal career goals with company domain.\n2. Highlight relevant past achievements.\n3. Show enthusiasm for company tech stack and culture.`,
        difficulty: 1
      });
    }
  });

  const flashcards = requirements.map((req, idx) => ({
    id: `f${idx + 1}`,
    front: `Key Concept: ${req.text.slice(0, 50)}`,
    back: `Essential preparation point for ${req.kind.toUpperCase()} evaluation regarding ${req.text}`,
    requirement_ids: [req.id]
  }));

  const companyName = companyBrief?.company_name || 'Target Company';
  const roleTitle = lines[0] ? lines[0].slice(0, 50) : 'Software Engineer';

  return {
    company_brief: {
      summary: companyBrief?.summary || `Analysis of ${companyName} for candidate interview preparation.`,
      what_they_do: companyBrief?.what_they_do || `${companyName} delivers products in the software engineering sector.`,
      sources: companyBrief?.pages_used || [companyUrl || 'http://localhost']
    },
    role: {
      title: roleTitle,
      seniority: 'Mid-Senior',
      responsibilities: lines.slice(1, 4).length > 0 ? lines.slice(1, 4) : ['Deliver production-grade code', 'Collaborate with cross-functional teams'],
      requirements: requirements
    },
    questions: questions,
    flashcards: flashcards
  };
}

export { generateFallbackKit };

