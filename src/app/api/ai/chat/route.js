import { NextResponse } from 'next/server';
import { connectDB, FileDB } from '../../../../lib/db.js';
import PrepKit from '../../../../models/PrepKit.js';
import { callLLMText } from '../../../../services/llm/index.js';
import mongoose from 'mongoose';

async function findKitById(id) {
  const query = { id: id };
  if (mongoose.Types.ObjectId.isValid(id)) {
    return await PrepKit.findOne({ $or: [{ id: id }, { _id: id }] });
  }
  return await PrepKit.findOne(query);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { kitId, message, history = [] } = body;

    if (!message || message.trim() === '') {
      return NextResponse.json({ success: false, error: 'Message cannot be empty.' }, { status: 400 });
    }

    const hasKey = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    if (!hasKey) {
      return NextResponse.json({
        success: false,
        error: 'No AI API key configured. Please set GEMINI_API_KEY in .env.',
        noKey: true
      }, { status: 503 });
    }

    // Retrieve kit context if kitId is provided
    let kitContext = '';
    if (kitId) {
      const isMongo = await connectDB();
      let kit = null;
      if (isMongo) {
        kit = await findKitById(kitId);
        if (kit) kit = kit.toObject();
      } else {
        kit = FileDB.getKitById(kitId);
      }

      if (kit) {
        const company = kit.source?.company || kit.company_brief?.company_name || 'Target Company';
        const role = kit.role?.title || 'Candidate';
        const reqSummary = (kit.role?.requirements || []).slice(0, 8).map(r => `- ${r.text} (${r.kind})`).join('\n');
        const qSummary = (kit.questions || []).slice(0, 5).map(q => `- [${q.category}] ${q.prompt}`).join('\n');

        kitContext = `
INTERVIEW KIT CONTEXT:
Target Company: ${company}
Target Role: ${role}
Company Overview: ${kit.company_brief?.summary || 'N/A'}
Core Requirements:
${reqSummary || 'None specified'}
Sample Interview Questions:
${qSummary || 'None specified'}
`;
      }
    }

    const systemPrompt = `You are an elite, encouraging AI Interview Coach and mentor. 
You assist candidates in preparing for their specific interview.
Provide clear, practical, structured, and actionable guidance. If the candidate asks technical or behavioural questions, provide crisp explanations, system design architectures, or STAR-method examples tailored to their role and company.
${kitContext}`;

    // Format conversational history
    const historyText = history.slice(-6).map(h => `${h.role === 'user' ? 'Candidate' : 'Coach'}: ${h.content}`).join('\n');
    const fullPrompt = historyText 
      ? `Previous conversation:\n${historyText}\n\nCandidate: ${message}\nCoach:`
      : `Candidate: ${message}\nCoach:`;

    const reply = await callLLMText(fullPrompt, systemPrompt);

    if (!reply) {
      return NextResponse.json({
        success: false,
        error: 'AI coach could not generate a reply. Please try again.'
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, reply });

  } catch (err) {
    console.error('[AI Chat] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
