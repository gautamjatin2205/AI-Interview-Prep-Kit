import { NextResponse } from 'next/server';
import { connectDB, FileDB } from '../../../../lib/db.js';
import PrepKit from '../../../../models/PrepKit.js';

export async function GET(req, { params }) {
  try {
    const { id } = params;
    const isMongo = await connectDB();

    let kit = null;
    if (isMongo) {
      kit = await PrepKit.findOne({ $or: [{ id: id }, { _id: id }] });
    } else {
      kit = FileDB.getKitById(id);
    }

    if (!kit) {
      return NextResponse.json({ success: false, error: 'Kit not found.' }, { status: 404 });
    }

    const flashcards = kit.flashcards || [];
    const practiceProgress = kit.practiceProgress || { confidenceScores: {}, coveredCardIds: [] };
    const scores = practiceProgress.confidenceScores || {};

    // Sort cards by lowest confidence score first (spaced-repetition priority)
    const sortedCards = [...flashcards].sort((a, b) => {
      const scoreA = scores[a.id] !== undefined ? scores[a.id] : 0; // 0 means unreviewed
      const scoreB = scores[b.id] !== undefined ? scores[b.id] : 0;
      return scoreA - scoreB;
    });

    const totalCards = flashcards.length;
    const coveredCards = (practiceProgress.coveredCardIds || []).length;

    return NextResponse.json({
      success: true,
      flashcards: sortedCards,
      stats: {
        total: totalCards,
        covered: coveredCards,
        uncovered: totalCards - coveredCards,
        confidenceScores: scores
      }
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = params;
    const { cardId, confidenceRating } = await req.json(); // rating: 1 to 5

    const isMongo = await connectDB();
    let kit = null;

    if (isMongo) {
      kit = await PrepKit.findOne({ $or: [{ id: id }, { _id: id }] });
    } else {
      kit = FileDB.getKitById(id);
    }

    if (!kit) {
      return NextResponse.json({ success: false, error: 'Kit not found.' }, { status: 404 });
    }

    const updatedKit = typeof kit.toObject === 'function' ? kit.toObject() : { ...kit };

    if (!updatedKit.practiceProgress) {
      updatedKit.practiceProgress = { confidenceScores: {}, coveredCardIds: [] };
    }

    if (!updatedKit.practiceProgress.confidenceScores) {
      updatedKit.practiceProgress.confidenceScores = {};
    }

    if (!updatedKit.practiceProgress.coveredCardIds) {
      updatedKit.practiceProgress.coveredCardIds = [];
    }

    // Update confidence score
    updatedKit.practiceProgress.confidenceScores[cardId] = confidenceRating;

    // Mark covered
    if (!updatedKit.practiceProgress.coveredCardIds.includes(cardId)) {
      updatedKit.practiceProgress.coveredCardIds.push(cardId);
    }

    // Save
    if (isMongo) {
      await PrepKit.findOneAndUpdate(
        { $or: [{ id: id }, { _id: id }] },
        { practiceProgress: updatedKit.practiceProgress, updatedAt: new Date() }
      );
    } else {
      FileDB.saveKit(updatedKit);
    }

    return NextResponse.json({
      success: true,
      message: 'Practice progress recorded.',
      practiceProgress: updatedKit.practiceProgress
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
