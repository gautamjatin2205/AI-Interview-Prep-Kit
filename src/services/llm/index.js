import axios from 'axios';

// Smart Rule-Based & Heuristic NLP Generator (Guarantees 100% reliable fallback)
function generateFallbackKit({ jd, companyUrl, companyBrief, days }) {
  console.log('[LLM] Generating kit via Heuristic Intelligent Engine...');

  const cleanJd = jd || '';
  const lines = cleanJd.split('\n').map(l => l.trim()).filter(l => l.length > 5);

  // Extract requirements from text lines
  const requirements = [];
  let reqCounter = 1;

  // Look for keywords
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

  // Ensure at least 3 requirements if JD is thin
  if (requirements.length === 0) {
    requirements.push(
      { id: 'r1', text: 'Core technical competency in position stack', kind: 'technical', priority: 'must' },
      { id: 'r2', text: 'Problem solving and system architecture skills', kind: 'technical', priority: 'must' },
      { id: 'r3', text: 'Effective communication and team collaboration', kind: 'behavioural', priority: 'nice' }
    );
  }

  // Generate questions referencing requirements
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
        prompt: `Why are you interested in joining ${companyBrief.company_name || 'this company'} and how does your background in "${req.text}" align with our mission?`,
        answer_outline: `1. Align personal career goals with company domain.\n2. Highlight relevant past achievements.\n3. Show enthusiasm for company tech stack and culture.`,
        difficulty: 1
      });
    }
  });

  // Generate Flashcards
  const flashcards = requirements.map((req, idx) => ({
    id: `f${idx + 1}`,
    front: `Key Concept: ${req.text.slice(0, 50)}`,
    back: `Essential preparation point for ${req.kind.toUpperCase()} evaluation regarding ${req.text}`,
    requirement_ids: [req.id]
  }));

  // Role details
  const companyName = companyBrief.company_name || 'Target Company';
  const roleTitle = lines[0] ? lines[0].slice(0, 50) : 'Software Engineer';

  return {
    company_brief: {
      summary: companyBrief.summary || `Analysis of ${companyName} for candidate interview preparation.`,
      what_they_do: companyBrief.what_they_do || `${companyName} delivers products in the software engineering sector.`,
      sources: companyBrief.pages_used || [companyUrl || 'http://localhost']
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

export async function callLLM(prompt, systemPrompt = '') {
  const provider = process.env.LLM_PROVIDER || 'auto';
  const openaiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  // 1. Try Groq (Ultra fast free tier)
  if ((provider === 'groq' || provider === 'auto') && groqKey && groqKey.trim() !== '') {
    try {
      console.log('[LLM] Calling Groq Llama3 API...');
      const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama3-70b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      }, {
        headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        timeout: 15000
      });
      return JSON.parse(res.data.choices[0].message.content);
    } catch (e) {
      console.warn('[LLM] Groq call failed or rate-limited:', e.message);
    }
  }

  // 2. Try OpenAI
  if ((provider === 'openai' || provider === 'auto') && openaiKey && openaiKey.trim() !== '') {
    try {
      console.log('[LLM] Calling OpenAI API...');
      const res = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      }, {
        headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        timeout: 15000
      });
      return JSON.parse(res.data.choices[0].message.content);
    } catch (e) {
      console.warn('[LLM] OpenAI call failed:', e.message);
    }
  }

  return null;
}

export { generateFallbackKit };
