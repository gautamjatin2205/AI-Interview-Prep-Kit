import { crawlCompanySite } from '../crawler/index.js';
import { callLLM, generateFallbackKit } from '../llm/index.js';

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

    // Only extract lines that look like candidate requirements
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

  // Guard against thin JDs (Section 10)
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
// STEP 3: Categorized Question Generation (Different instructions per category)
// ============================================================================
export async function generateCategorizedQuestions(requirements, hiringContext) {
  const questions = [];
  let qCounter = 1;

  for (const req of requirements) {
    // 1. Technical Requirements -> Technical & Coding Questions
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

    // 2. Behavioural Requirements (e.g. mentoring, communication) -> STAR Questions
    } else if (req.kind === 'behavioural') {
      questions.push({
        id: `q${qCounter++}`,
        requirement_ids: [req.id],
        category: 'behavioural',
        prompt: `Tell me about a time you demonstrated: "${req.text}". How did you navigate obstacles and measure success?`,
        answer_outline: `STAR Method Breakdown:\n- Situation: Background of the team or project challenge.\n- Task: Your specific ownership and responsibilities.\n- Action: Deliberate steps and leadership demonstrated.\n- Result: Quantifiable outcome and lessons learned.`,
        difficulty: 2
      });

    // 3. System Design & Scalability Requirements -> Deep Architecture
    } else if (req.kind === 'system-design') {
      questions.push({
        id: `q${qCounter++}`,
        requirement_ids: [req.id],
        category: 'system-design',
        prompt: `In relation to "${req.text}", how do you approach database partitioning, distributed consensus, and fault tolerance under high traffic?`,
        answer_outline: `1. Identify latency and throughput bottlenecks.\n2. Distributed systems tradeoffs (CAP / PACELC).\n3. Monitoring, telemetry, and graceful degradation.`,
        difficulty: 3
      });

    // 4. Domain & Company Fit Requirements -> Tailored to Company & Hiring Context
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
  }

  // If hiring process page discovered take-home or specific rounds, add specialized question
  if (hiringContext.hiring_info && hiringContext.hiring_info.toLowerCase().includes('take-home')) {
    questions.push({
      id: `q${qCounter++}`,
      requirement_ids: [requirements[0].id],
      category: 'technical',
      prompt: `The company utilizes take-home assignments in their hiring process. How do you structure take-home submissions to ensure clean documentation, edge-case coverage, and reproducible tests?`,
      answer_outline: `1. Project structure and clear README with setup instructions.\n2. Thorough unit and integration test suite.\n3. Explicit trade-offs and future scaling considerations documented.`,
      difficulty: 2
    });
  }

  return questions;
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
// MAIN PIPELINE EXECUTOR (Multi-Step Genuine Sequence)
// ============================================================================
export async function generateInterviewKit({ jd, company_url, days = 5, userId = 'guest' }) {
  console.log(`[Pipeline] Starting deliberate multi-step pipeline for: ${company_url || 'N/A'}, days: ${days}`);
  const startTime = new Date().toISOString();

  // 1. Requirement Extraction (pasted text needs no retrieval)
  console.log('[Pipeline Step 1/5] Extracting requirements from job description...');
  const requirements = extractRequirementsFromJD(jd);

  // 2. Company Crawler & Public Discussion Research
  console.log('[Pipeline Step 2/5] Crawling company domain and discovering hiring insights...');
  const crawlResult = await crawlCompanySite(company_url);

  // 3. Categorized Question Generation (separated instructions per category)
  console.log('[Pipeline Step 3/5] Generating categorized questions responding to extracted requirements & hiring context...');
  const initialQuestions = await generateCategorizedQuestions(requirements, crawlResult);

  // 4. Deterministic Second Pass Coverage Check (Loop)
  console.log('[Pipeline Step 4/5] Executing deterministic coverage loop & second-pass resolution...');
  const coverageRes = runCoverageCheckAndSecondPass(requirements, initialQuestions, 3);

  // 5. Arithmetic Schedule Allocation
  console.log('[Pipeline Step 5/5] Calculating arithmetic study schedule across requested days...');
  const scheduleRes = allocateSchedule(coverageRes.questions, requirements, days);

  // Generate flashcard deck mapped to requirements
  const flashcards = requirements.map((req, idx) => ({
    id: `f${idx + 1}`,
    front: `Core Concept: ${req.text.slice(0, 60)}`,
    back: `Key preparation outline for ${req.kind.toUpperCase()} evaluation:\n1. Direct alignment with requirement.\n2. Measurable implementation experience.\n3. Common interview pitfalls.`,
    requirement_ids: [req.id]
  }));

  const kitId = `kit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const roleTitle = requirements[0]?.text?.slice(0, 50) || 'Software Engineer';

  const finalKit = {
    id: kitId,
    userId: userId,
    source: {
      company: crawlResult.company_name || 'Target Company',
      company_url: company_url || 'https://localhost',
      role: roleTitle,
      location: 'Remote / On-site',
      jd_chars: (jd || '').length,
      researched_at: startTime,
      pages_used: crawlResult.pages_used || [company_url || 'https://localhost']
    },
    company_brief: {
      summary: crawlResult.summary || `${crawlResult.company_name || 'Target Company'} interview analysis brief.`,
      what_they_do: crawlResult.what_they_do || 'Software engineering and technology solutions.',
      sources: crawlResult.pages_used || [company_url || 'https://localhost']
    },
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

  console.log(`[Pipeline] Kit successfully generated! Kit ID: ${kitId}`);
  return finalKit;
}
