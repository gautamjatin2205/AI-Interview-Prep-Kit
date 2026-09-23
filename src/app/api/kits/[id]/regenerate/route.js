import { NextResponse } from 'next/server';
import { connectDB, FileDB, getKitQuery } from '../../../../../lib/db.js';
import PrepKit from '../../../../../models/PrepKit.js';
import { allocateSchedule } from '../../../../../services/pipeline/index.js';
import { crawlCompanySite } from '../../../../../services/crawler/index.js';

export async function POST(req, { params }) {
  try {
    const { id } = params;
    const { target, categoryName } = await req.json();

    const isMongo = await connectDB();
    let kit = null;

    if (isMongo) {
      kit = await PrepKit.findOne(getKitQuery(id));
    } else {
      kit = FileDB.getKitById(id);
    }

    if (!kit) {
      return NextResponse.json({ success: false, error: 'Kit not found.' }, { status: 404 });
    }

    const updatedKit = typeof kit.toObject === 'function' ? kit.toObject() : { ...kit };

    // 1. Regenerate Company Brief (without touching questions/schedule)
    if (target === 'company_brief') {
      const crawlRes = await crawlCompanySite(updatedKit.source.company_url);
      updatedKit.company_brief = {
        summary: crawlRes.summary || `Updated analysis of ${updatedKit.source.company}.`,
        what_they_do: crawlRes.what_they_do || `Operations and core offerings of ${updatedKit.source.company}.`,
        sources: crawlRes.pages_used || [updatedKit.source.company_url]
      };
    }

    // 2. Regenerate Schedule (arithmetic calculation based on current questions)
    else if (target === 'schedule') {
      const daysAvail = updatedKit.schedule ? updatedKit.schedule.days_available : 5;
      const newSchedule = allocateSchedule(updatedKit.questions, updatedKit.role.requirements, daysAvail);
      updatedKit.schedule = newSchedule;
    }

    // 3. Regenerate Single Question Category (preserving manual edits & pinned questions!)
    else if (target === 'category' && categoryName) {
      // Filter out unpinned/unedited questions in this category
      const preservedQuestions = updatedKit.questions.filter(q => {
        if (q.category !== categoryName) return true; // keep other categories untouched
        return q.isUserEdited || q.isPinned;          // keep user-edited or pinned questions
      });

      // Generate new fresh questions for this category
      const targetReqs = updatedKit.role.requirements;
      let nextQId = updatedKit.questions.length + 10;

      const freshCategoryQuestions = targetReqs.map(req => ({
        id: `q_regen_${nextQId++}`,
        requirement_ids: [req.id],
        category: categoryName,
        prompt: `[Regenerated Focus] Advanced ${categoryName.toUpperCase()} question on: "${req.text}"`,
        answer_outline: `1. In-depth analysis of ${req.text}.\n2. Real-world scenario application.\n3. Trade-offs and best practices.`,
        difficulty: req.priority === 'must' ? 3 : 2,
        isUserEdited: false,
        isPinned: false
      }));

      updatedKit.questions = [...preservedQuestions, ...freshCategoryQuestions];
      
      // Re-allocate schedule to include new questions
      const daysAvail = updatedKit.schedule ? updatedKit.schedule.days_available : 5;
      updatedKit.schedule = allocateSchedule(updatedKit.questions, updatedKit.role.requirements, daysAvail);
    }

    // Save back to DB
    if (isMongo) {
      await PrepKit.findOneAndUpdate(
        getKitQuery(id),
        { ...updatedKit, updatedAt: new Date() }
      );
    } else {
      FileDB.saveKit(updatedKit);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully regenerated ${target}${categoryName ? ' (' + categoryName + ')' : ''} while preserving user edits!`,
      kit: updatedKit
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
