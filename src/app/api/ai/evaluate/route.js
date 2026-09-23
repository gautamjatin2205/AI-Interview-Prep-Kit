import { NextResponse } from 'next/server';
import { callLLM } from '../../../../services/llm/index.js';

export async function POST(req) {
  try {
    const body = await req.json();
    const { question, userAnswer, category, roleContext } = body;

    if (!question || !userAnswer) {
      return NextResponse.json({ success: false, error: 'question and userAnswer are required.' }, { status: 400 });
    }

    const hasKey = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    if (!hasKey) {
      return NextResponse.json({
        success: false,
        error: 'No AI API key configured. Add GEMINI_API_KEY to your .env to enable AI evaluation.',
        noKey: true
      }, { status: 503 });
    }

    const systemPrompt = `You are an expert interview coach evaluating a candidate's answer. Be specific, constructive, and encouraging. Evaluate based on the question category: ${category || 'general'}.`;

    const prompt = `Evaluate this interview answer and return a JSON assessment.

INTERVIEW QUESTION:
${question}

CANDIDATE'S ANSWER:
${userAnswer}

ROLE CONTEXT: ${roleContext || 'Software Engineering role'}

Evaluate the answer and return this exact JSON structure:
{
  "score": <number 1-10>,
  "grade": "<Excellent|Good|Fair|Needs Work>",
  "strengths": ["specific strength 1", "specific strength 2"],
  "improvements": ["specific improvement 1", "specific improvement 2"],
  "model_answer": "A concise model answer showing what an ideal response covers",
  "tip": "One actionable tip to improve delivery in an actual interview"
}`;

    const result = await callLLM(prompt, systemPrompt);

    if (!result || typeof result.score !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'AI evaluation returned an unexpected format. Please try again.'
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, evaluation: result });

  } catch (err) {
    console.error('[AI Evaluate] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
