import { NextResponse } from 'next/server';
import { callLLMText } from '../../../../services/llm/index.js';

export async function POST(req) {
  try {
    const body = await req.json();
    const { question, roleTitle, company, category } = body;

    if (!question) {
      return NextResponse.json({ success: false, error: 'Question is required.' }, { status: 400 });
    }

    const hasKey = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    if (!hasKey) {
      return NextResponse.json({
        success: false,
        error: 'No AI API key configured. Please set GEMINI_API_KEY in .env.',
        noKey: true
      }, { status: 503 });
    }

    const systemPrompt = `You are a senior tech interviewer giving a candidate a strategic hint for an upcoming interview. Do not give away the entire answer word-for-word. Instead, give them an expert roadmap: 
1) What the interviewer is secretly testing for
2) The best mental model or framework to structure the answer (e.g. STAR method, system design trade-offs, time/space complexity)
3) One fatal pitfall to avoid.
Keep the total response under 150 words, clean and bulleted.`;

    const prompt = `Give a strategic interview hint for this question:
Question: "${question}"
Category: ${category || 'General'}
Target Role: ${roleTitle || 'Software Engineer'}
Target Company: ${company || 'Technology Company'}`;

    const hint = await callLLMText(prompt, systemPrompt);

    if (!hint) {
      return NextResponse.json({
        success: false,
        error: 'AI hint could not be generated. Please try again.'
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, hint });

  } catch (err) {
    console.error('[AI Hint] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
