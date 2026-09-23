import mongoose from 'mongoose';

const PrepKitSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  source: {
    company: String,
    company_url: String,
    role: String,
    location: String,
    jd_chars: Number,
    researched_at: String,
    pages_used: [String]
  },
  company_brief: {
    summary: String,
    what_they_do: String,
    sources: [String]
  },
  role: {
    title: String,
    seniority: String,
    responsibilities: [String],
    requirements: [
      {
        id: String,
        text: String,
        kind: { type: String }, // technical | behavioural | system-design | domain
        priority: { type: String, enum: ['must', 'nice'] }
      }
    ]
  },
  questions: [
    {
      id: String,
      requirement_ids: [String],
      category: { type: String }, // technical | behavioural | system-design | company-fit
      prompt: String,
      answer_outline: String,
      difficulty: Number,
      isUserEdited: Boolean,
      isPinned: Boolean
    }
  ],
  flashcards: [
    {
      id: String,
      front: String,
      back: String,
      requirement_ids: [String],
      isUserEdited: Boolean
    }
  ],
  schedule: {
    days_available: Number,
    days: [
      {
        day: Number,
        focus: String,
        question_ids: [String],
        minutes: Number
      }
    ]
  },
  coverage: {
    uncovered_requirement_ids: [String],
    passes: Number
  },
  practiceProgress: {
    confidenceScores: { type: mongoose.Schema.Types.Mixed, default: {} }, // { f1: 4, f2: 2 }
    coveredCardIds: [String]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  // Allow fields not defined in schema (for flexibility during kit editing)
  strict: false
});

export default mongoose.models.PrepKit || mongoose.model('PrepKit', PrepKitSchema);
