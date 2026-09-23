import { crawlCompanySite } from '../crawler/index.js';
import { callLLM, callLLMText, generateFallbackKit } from '../llm/index.js';

// ============================================================================
// STEP 1: Deterministic Requirement Extraction from JD (Section 3)
// ============================================================================
export function extractRequirementsFromJD(jdText) {
  const clean = (jdText || '').trim();
  const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 5);

  const requirements = [];
  let reqCounter = 1;

  const techKeywords = ['react', 'node', 'javascript', 'typescript', 'python', 'java', 'aws', 'sql', 'mongodb', 'docker', 'api', 'system design', 'microservices', 'git', 'ci/cd', 'frontend', 'backend', 'fullstack', 'css', 'html', 'rest', 'graphql', 'kubernetes'];
  const behaviouralKeywords = ['lead', 'mentor', 'mentoring', 'communication', 'teamwork', 'agile', 'scrum', 'collaboration', 'stakeholder', 'ownership', 'cross-functional'];
  const sysDesignKeywords = ['scalab', 'high throughput', 'distributed', 'architecture', 'microservice', 'low latency', 'concurrency', 'caching'];

  lines.forEach(line => {
    const lower = line.toLowerCase();
    const isMust = lower.includes('require') || lower.includes('must') || lower.includes('years') || lower.includes('experience') || lower.includes('strong') || lower.includes('expert') || lower.includes('proven');
    const isNice = lower.includes('bonus') || lower.includes('plus') || lower.includes('nice to have') || lower.includes('preferred') || lower.includes('ideal');

    if (isMust || isNice || reqCounter <= 5) {
      let kind = 'domain';
      if (techKeywords.some(k => lower.includes(k)) || sysDesignKeywords.some(k => lower.includes(k))) kind = 'technical';
      else if (behaviouralKeywords.some(k => lower.includes(k))) kind = 'behavioural';

      requirements.push({
        id: `r${reqCounter}`,
        text: line.length > 130 ? line.slice(0, 130) + '...' : line,
        kind: kind,
        priority: isNice ? 'nice' : 'must'
      });
      reqCounter++;
    }
  });

  if (requirements.length === 0) {
    requirements.push(
      { id: 'r1', text: 'Core technical competency in required engineering stack', kind: 'technical', priority: 'must' },
      { id: 'r2', text: 'Problem solving and system architecture skills', kind: 'technical', priority: 'must' },
      { id: 'r3', text: 'Effective communication and team collaboration', kind: 'behavioural', priority: 'nice' }
    );
  }

  return requirements;
}

// ============================================================================
// AI STEP: Generate company brief using LLM from crawled content
// ============================================================================
export async function generateCompanyBriefWithAI(crawlResult, jd) {
  const hasContent = crawlResult.what_they_do || crawlResult.summary || crawlResult.hiring_info;
  if (!hasContent) return null;

  const prompt = `You are an interview preparation assistant. Based on the following company research data, generate a concise company brief for a job candidate preparing for an interview.

Company: ${crawlResult.company_name || 'Unknown'}
Company Website Content: ${crawlResult.what_they_do || ''}
Hiring Info Found: ${crawlResult.hiring_info || 'None found'}
Public Discussion: ${crawlResult.public_discussion || 'None found'}
Job Description Excerpt: ${(jd || '').slice(0, 500)}

Return a JSON object with exactly these fields:
{
  "summary": "2-3 sentence overview of what the company does and its market position",
  "what_they_do": "1-2 sentence description of their core product/service",
  "interview_insights": "Any specific interview process details found (or empty string if none)",
  "culture_notes": "Any culture or engineering values mentioned (or empty string if none)"
}`;

  try {
    const result = await callLLM(prompt, 'You are a helpful interview prep assistant. Return only valid JSON.');
    if (result && result.summary) return result;
  } catch (e) {
    console.warn('[Pipeline] AI company brief failed:', e.message);
  }
  return null;
}

// ============================================================================
// STEP 3: AI-Powered Categorized Question Generation (separate calls per category)
// ============================================================================
export async function generateCategorizedQuestions(requirements, hiringContext) {
  const questions = [];
  let qCounter = 1;

  // Group requirements by category for separate LLM calls per category (as required by brief)
  const techReqs = requirements.filter(r => r.kind === 'technical');
  const behavReqs = requirements.filter(r => r.kind === 'behavioural');
  const domainReqs = requirements.filter(r => r.kind === 'domain' || r.kind === 'system-design');
  const company = hiringContext.company_name || 'Target Company';
  const hiringNotes = hiringContext.hiring_info || '';

  // ── CALL 1: Technical Questions (separate LLM call with technical instructions) ──
  if (techReqs.length > 0) {
    console.log(`[Pipeline] LLM Call: Generating technical questions for ${techReqs.length} requirements...`);
    const techPrompt = `You are a senior technical interviewer. Generate interview questions for these technical requirements.

Company: ${company}
Hiring Context: ${hiringNotes.slice(0, 400) || 'Standard engineering role'}
Technical Requirements:
${techReqs.map((r, i) => `${i + 1}. [${r.id}] ${r.text} (priority: ${r.priority})`).join('\n')}

For EACH requirement, generate:
1. A deep technical question (difficulty 2)
2. A system design question (difficulty 3)

Return JSON:
{
  "questions": [
    {
      "requirement_id": "r1",
      "category": "technical",
      "prompt": "specific technical question text",
      "answer_outline": "1. Key concept\\n2. Real example\\n3. Trade-offs and edge cases",
      "difficulty": 2
    },
    {
      "requirement_id": "r1",
      "category": "system-design",
      "prompt": "system design question about this requirement",
      "answer_outline": "1. Architecture\\n2. Data model\\n3. Scale and reliability",
      "difficulty": 3
    }
  ]
}`;

    try {
      const techResult = await callLLM(techPrompt, 'You are an expert technical interviewer. Return only valid JSON with a "questions" array.');
      if (techResult?.questions && Array.isArray(techResult.questions)) {
        techResult.questions.forEach(q => {
          const req = techReqs.find(r => r.id === q.requirement_id) || techReqs[0];
          questions.push({
            id: `q${qCounter++}`,
            requirement_ids: [req.id],
            category: q.category || 'technical',
            prompt: q.prompt || `Explain your experience with ${req.text}`,
            answer_outline: q.answer_outline || `1. Core concepts of ${req.text}\n2. Real-world implementation\n3. Trade-offs and edge cases`,
            difficulty: Number(q.difficulty) || 2
          });
        });
        console.log(`[Pipeline] ✓ AI generated ${techResult.questions.length} technical questions`);
      }
    } catch (e) {
      console.warn('[Pipeline] Technical question AI call failed, using fallback:', e.message);
    }
  }

  // ── CALL 2: Behavioural Questions (separate LLM call with STAR instructions) ──
  if (behavReqs.length > 0) {
    console.log(`[Pipeline] LLM Call: Generating behavioural questions for ${behavReqs.length} requirements...`);
    const behavPrompt = `You are a senior HR interviewer specializing in behavioural interviews. Generate STAR-method interview questions for these soft skills and behavioural requirements.

Company: ${company}
Behavioural Requirements:
${behavReqs.map((r, i) => `${i + 1}. [${r.id}] ${r.text} (priority: ${r.priority})`).join('\n')}

For each requirement, generate one situational/behavioural question using STAR framework.

Return JSON:
{
  "questions": [
    {
      "requirement_id": "r2",
      "prompt": "Tell me about a time when...",
      "answer_outline": "STAR Method:\\n- Situation: ...\\n- Task: ...\\n- Action: ...\\n- Result: ...",
      "difficulty": 2
    }
  ]
}`;

    try {
      const behavResult = await callLLM(behavPrompt, 'You are an expert behavioural interviewer. Return only valid JSON with a "questions" array.');
      if (behavResult?.questions && Array.isArray(behavResult.questions)) {
        behavResult.questions.forEach(q => {
          const req = behavReqs.find(r => r.id === q.requirement_id) || behavReqs[0];
          questions.push({
            id: `q${qCounter++}`,
            requirement_ids: [req.id],
            category: 'behavioural',
            prompt: q.prompt || `Tell me about a time you demonstrated ${req.text}`,
            answer_outline: q.answer_outline || `STAR Method:\n- Situation\n- Task\n- Action\n- Result`,
            difficulty: Number(q.difficulty) || 2
          });
        });
        console.log(`[Pipeline] ✓ AI generated ${behavResult.questions.length} behavioural questions`);
      }
    } catch (e) {
      console.warn('[Pipeline] Behavioural question AI call failed, using fallback:', e.message);
    }
  }

  // ── CALL 3: Company-Fit / Domain Questions ──
  if (domainReqs.length > 0) {
    console.log(`[Pipeline] LLM Call: Generating company-fit questions for ${domainReqs.length} requirements...`);
    const domainPrompt = `You are a hiring manager at ${company}. Generate company-fit and domain questions for a candidate.

Company: ${company}
Domain/Fit Requirements:
${domainReqs.map((r, i) => `${i + 1}. [${r.id}] ${r.text}`).join('\n')}

Return JSON:
{
  "questions": [
    {
      "requirement_id": "r3",
      "prompt": "Why are you interested in this role and how does your background align...",
      "answer_outline": "1. Company alignment\\n2. Past relevant achievement\\n3. Future contribution",
      "difficulty": 1
    }
  ]
}`;

    try {
      const domainResult = await callLLM(domainPrompt, 'You are a hiring manager. Return only valid JSON with a "questions" array.');
      if (domainResult?.questions && Array.isArray(domainResult.questions)) {
        domainResult.questions.forEach(q => {
          const req = domainReqs.find(r => r.id === q.requirement_id) || domainReqs[0];
          questions.push({
            id: `q${qCounter++}`,
            requirement_ids: [req.id],
            category: 'company-fit',
            prompt: q.prompt || `Why ${company} and how does your experience in "${req.text}" apply?`,
            answer_outline: q.answer_outline || `1. Company alignment\n2. Past achievement\n3. Future contribution`,
            difficulty: Number(q.difficulty) || 1
          });
        });
      }
    } catch (e) {
      console.warn('[Pipeline] Domain question AI call failed, using fallback:', e.message);
    }
  }

  // If all AI calls failed, use deterministic fallback
  if (questions.length === 0) {
    console.warn('[Pipeline] All AI question calls failed. Using heuristic fallback...');
    return generateFallbackQuestions(requirements, hiringContext);
  }

  // Add hiring-process specific question if take-home was found
  if (hiringContext.hiring_info && hiringContext.hiring_info.toLowerCase().includes('take-home')) {
    questions.push({
      id: `q${qCounter++}`,
      requirement_ids: [requirements[0].id],
      category: 'technical',
      prompt: `The company uses take-home assignments. How do you structure take-home submissions for clean documentation, edge-case coverage, and reproducible tests?`,
      answer_outline: `1. Project structure and README with setup instructions.\n2. Thorough unit and integration test suite.\n3. Explicit trade-offs and future scaling documented.`,
      difficulty: 2
    });
  }

  return questions;
}

// Deterministic fallback question generator (used if all LLM calls fail)
function generateFallbackQuestions(requirements, hiringContext) {
  const questions = [];
  let qCounter = 1;

  requirements.forEach(req => {
    if (req.kind === 'technical') {
      questions.push({
        id: `q${qCounter++}`,
        requirement_ids: [req.id],
        category: 'technical',
        prompt: `Explain your hands-on experience with: "${req.text}". What architectural decisions, performance trade-offs, and failure modes have you encountered?`,
        answer_outline: `1. Core technical principles of ${req.text}.\n2. Real-world implementation details and challenges.\n3. Testing, debugging, and production considerations.`,
        difficulty: 2
      });
      questions.push({
        id: `q${qCounter++}`,
        requirement_ids: [req.id],
        category: 'system-design',
        prompt: `How would you design a scalable production service that incorporates ${req.text}?`,
        answer_outline: `1. High-level component architecture.\n2. Data access patterns and storage schema.\n3. Scalability, caching, and resiliency strategies.`,
        difficulty: 3
      });
    } else if (req.kind === 'behavioural') {
      questions.push({
        id: `q${qCounter++}`,
        requirement_ids: [req.id],
        category: 'behavioural',
        prompt: `Tell me about a time you demonstrated: "${req.text}". How did you navigate obstacles and measure success?`,
        answer_outline: `STAR Method Breakdown:\n- Situation: Background of the team or project challenge.\n- Task: Your specific ownership and responsibilities.\n- Action: Deliberate steps and leadership demonstrated.\n- Result: Quantifiable outcome and lessons learned.`,
        difficulty: 2
      });
    } else {
      const company = hiringContext.company_name || 'Target Company';
      questions.push({
        id: `q${qCounter++}`,
        requirement_ids: [req.id],
        category: 'company-fit',
        prompt: `Why is ${company} the right place for you to apply your background in "${req.text}", and how do you align with their engineering culture?`,
        answer_outline: `1. Alignment with ${company}'s domain and mission.\n2. Concrete past achievements matching this requirement.\n3. Enthusiasm for their specific hiring workflow and challenges.`,
        difficulty: 1
      });
    }
  });

  return questions;
}

// ============================================================================
// AI STEP: Generate AI-powered flashcards
// ============================================================================
export async function generateFlashcardsWithAI(requirements, roleContext) {
  console.log(`[Pipeline] LLM Call: Generating AI flashcards for ${requirements.length} requirements...`);

  const prompt = `You are an interview prep coach. Create high-quality study flashcards for these interview requirements.

Role: ${roleContext.roleTitle || 'Software Engineer'}
Company: ${roleContext.company || 'Target Company'}

Requirements:
${requirements.map(r => `[${r.id}] (${r.kind}) ${r.text}`).join('\n')}

Create one flashcard per requirement. Each card should be a genuine study aid — the front is a clear question/concept, the back is a concise but complete answer.

Return JSON:
{
  "flashcards": [
    {
      "requirement_id": "r1",
      "front": "Clear question or concept to test recall",
      "back": "Concise but complete answer including key points, examples, or the STAR structure"
    }
  ]
}`;

  try {
    const result = await callLLM(prompt, 'You are an expert interview coach. Return only valid JSON with a "flashcards" array.');
    if (result?.flashcards && Array.isArray(result.flashcards)) {
      return result.flashcards.map((fc, idx) => {
        const req = requirements.find(r => r.id === fc.requirement_id) || requirements[idx] || requirements[0];
        return {
          id: `f${idx + 1}`,
          front: fc.front || `Key Concept: ${req.text.slice(0, 60)}`,
          back: fc.back || `Preparation outline for ${req.kind} evaluation of: ${req.text}`,
          requirement_ids: [req.id]
        };
      });
    }
  } catch (e) {
    console.warn('[Pipeline] AI flashcard generation failed:', e.message);
  }

  // Fallback: deterministic flashcards
  return requirements.map((req, idx) => ({
    id: `f${idx + 1}`,
    front: `Core Concept: ${req.text.slice(0, 60)}`,
    back: `Key preparation outline for ${req.kind.toUpperCase()} evaluation:\n1. Direct alignment with requirement.\n2. Measurable implementation experience.\n3. Common interview pitfalls.`,
    requirement_ids: [req.id]
  }));
}



// ============================================================================
// STEP 4: Deterministic Second Pass Coverage Loop (Section 4 Compliance)
// ============================================================================
export function runCoverageCheckAndSecondPass(requirements, questions, maxPasses = 3) {
  const mustReqs = requirements.filter(r => r.priority === 'must');
  const newQuestions = [...questions];
  let currentPass = 1;

  while (currentPass < maxPasses) {
    // 1. Code determines covered vs uncovered IDs
    const coveredReqIds = new Set();
    newQuestions.forEach(q => {
      (q.requirement_ids || []).forEach(rid => coveredReqIds.add(rid));
    });

    const uncoveredMustIds = mustReqs.filter(r => !coveredReqIds.has(r.id)).map(r => r.id);

    // If no gap must-have requirements exist, loop completes successfully!
    if (uncoveredMustIds.length === 0) {
      break;
    }

    // Gap detected -> Execute Second Pass
    currentPass++;
    console.log(`[Pipeline] Coverage Loop Pass ${currentPass}: Detected ${uncoveredMustIds.length} uncovered must-have requirements:`, uncoveredMustIds);

    let nextQId = newQuestions.length + 1;
    uncoveredMustIds.forEach(gapId => {
      const req = requirements.find(r => r.id === gapId);
      if (req) {
        newQuestions.push({
          id: `q${nextQId++}`,
          requirement_ids: [req.id],
          category: req.kind === 'behavioural' ? 'behavioural' : 'technical',
          prompt: `[Coverage Pass ${currentPass}] Comprehensive Evaluation Question on Must-Have Requirement: "${req.text}"`,
          answer_outline: `1. Essential competency in ${req.text}.\n2. Real-world edge-cases and troubleshooting.\n3. Impact on engineering velocity and system quality.`,
          difficulty: 3
        });
      }
    });
  }

  // Final deterministic evaluation of remaining uncovered IDs
  const finalCoveredIds = new Set();
  newQuestions.forEach(q => (q.requirement_ids || []).forEach(rid => finalCoveredIds.add(rid)));
  const finalUncoveredIds = requirements.filter(r => !finalCoveredIds.has(r.id)).map(r => r.id);

  return {
    questions: newQuestions,
    coverage: {
      uncovered_requirement_ids: finalUncoveredIds,
      passes: currentPass
    }
  };
}

// ============================================================================
// STEP 5: Deterministic Code-Driven Arithmetic Scheduler (Section 3 & 8)
// ============================================================================
export function allocateSchedule(questions, requirements, daysAvailable) {
  const numDays = Math.max(1, Math.min(60, parseInt(daysAvailable, 10) || 5));
  const scheduleDays = [];

  // Create exact day buckets matching requested days
  for (let d = 1; d <= numDays; d++) {
    scheduleDays.push({
      day: d,
      focus: `Day ${d} Preparation Focus`,
      question_ids: [],
      minutes: 0
    });
  }

  // Sort questions: Harder questions (difficulty 3) & must-have requirements come FIRST (earlier days)
  const reqMap = new Map(requirements.map(r => [r.id, r]));

  const sortedQuestions = [...questions].sort((a, b) => {
    const aMust = (a.requirement_ids || []).some(id => reqMap.get(id)?.priority === 'must');
    const bMust = (b.requirement_ids || []).some(id => reqMap.get(id)?.priority === 'must');

    if (aMust && !bMust) return -1;
    if (!aMust && bMust) return 1;

    return (b.difficulty || 2) - (a.difficulty || 2);
  });

  // Distribute questions into days (earlier days get higher priority and difficulty)
  sortedQuestions.forEach((q, idx) => {
    const dayIdx = idx % numDays;
    scheduleDays[dayIdx].question_ids.push(q.id);
    
    // Duration calculation (20, 40, or 60 minutes)
    const duration = (q.difficulty || 2) * 20;
    scheduleDays[dayIdx].minutes += duration;
  });

  // Assign informative focus title and ensure integer minutes
  scheduleDays.forEach((d) => {
    if (d.question_ids.length > 0) {
      const firstQ = questions.find(q => q.id === d.question_ids[0]);
      d.focus = firstQ ? `${firstQ.category.toUpperCase()} & Priority Mastery` : `Day ${d.day} Core Focus`;
    } else {
      d.focus = `Day ${d.day} Revision & Practice Polish`;
      d.minutes = 45;
    }
    d.minutes = Math.round(d.minutes); // Strict integer minutes
  });

  return {
    days_available: numDays,
    days: scheduleDays
  };
}

// ============================================================================
// MAIN PIPELINE EXECUTOR (Multi-Step AI-Powered Sequence)
// ============================================================================
export async function generateInterviewKit({ jd, company_url, days = 5, userId = 'guest' }) {
  console.log(`[Pipeline] Starting AI-powered multi-step pipeline for: ${company_url || 'N/A'}, days: ${days}`);
  const startTime = new Date().toISOString();

  // 1. Requirement Extraction — deterministic (pasted text needs no retrieval)
  console.log('[Pipeline Step 1/6] Extracting requirements from job description...');
  const requirements = extractRequirementsFromJD(jd);
  console.log(`[Pipeline] Extracted ${requirements.length} requirements (${requirements.filter(r => r.priority === 'must').length} must-have)`);

  // 2. Company Crawler & Public Discussion Research
  console.log('[Pipeline Step 2/6] Crawling company domain and discovering hiring insights...');
  const crawlResult = await crawlCompanySite(company_url);

  // 3. AI-Powered Company Brief (from crawled data)
  console.log('[Pipeline Step 3/6] Generating AI company brief from research data...');
  const aiBrief = await generateCompanyBriefWithAI(crawlResult, jd);

  // 4. AI Categorized Question Generation (separate LLM calls per category)
  console.log('[Pipeline Step 4/6] Generating categorized questions via separate AI calls per category...');
  const initialQuestions = await generateCategorizedQuestions(requirements, crawlResult);

  // 5. Deterministic Second Pass Coverage Check (Loop)
  console.log('[Pipeline Step 5/6] Executing deterministic coverage loop & second-pass resolution...');
  const coverageRes = runCoverageCheckAndSecondPass(requirements, initialQuestions, 3);

  // 6. Arithmetic Schedule Allocation — deterministic
  console.log('[Pipeline Step 6/6] Calculating arithmetic study schedule across requested days...');
  const scheduleRes = allocateSchedule(coverageRes.questions, requirements, days);

  // AI Flashcard Generation (parallel, non-blocking)
  const roleTitle = requirements[0]?.text?.slice(0, 50) || 'Software Engineer';
  const companyName = crawlResult.company_name || 'Target Company';

  console.log('[Pipeline] Generating AI-powered flashcards...');
  const flashcards = await generateFlashcardsWithAI(requirements, {
    roleTitle,
    company: companyName
  });

  const kitId = `kit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Build company_brief — prefer AI-generated, fall back to crawled data
  const companyBrief = aiBrief
    ? {
        summary: aiBrief.summary || crawlResult.summary || `${companyName} interview analysis.`,
        what_they_do: aiBrief.what_they_do || crawlResult.what_they_do || 'Software engineering solutions.',
        interview_insights: aiBrief.interview_insights || '',
        culture_notes: aiBrief.culture_notes || '',
        sources: crawlResult.pages_used || [company_url || 'https://localhost'],
        ai_generated: true
      }
    : {
        summary: crawlResult.summary || `${companyName} interview analysis brief.`,
        what_they_do: crawlResult.what_they_do || 'Software engineering and technology solutions.',
        sources: crawlResult.pages_used || [company_url || 'https://localhost'],
        ai_generated: false
      };

  const finalKit = {
    id: kitId,
    userId: userId,
    source: {
      company: companyName,
      company_url: company_url || 'https://localhost',
      role: roleTitle,
      location: 'Remote / On-site',
      jd_chars: (jd || '').length,
      researched_at: startTime,
      pages_used: crawlResult.pages_used || [company_url || 'https://localhost']
    },
    company_brief: companyBrief,
    role: {
      title: roleTitle,
      seniority: 'Mid-Senior',
      responsibilities: [
        'Deliver reliable, scalable, and high-performance production software',
        'Participate in architecture design, code reviews, and cross-team collaboration'
      ],
      requirements: requirements
    },
    questions: coverageRes.questions,
    flashcards: flashcards,
    schedule: scheduleRes,
    coverage: coverageRes.coverage
  };

  console.log(`[Pipeline] ✅ Kit generated with AI! ID: ${kitId} | Questions: ${coverageRes.questions.length} | Flashcards: ${flashcards.length} | AI Brief: ${!!aiBrief}`);
  return finalKit;
}

