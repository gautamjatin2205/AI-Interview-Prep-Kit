'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BookOpen, Star, RotateCcw, CheckCircle2, Eye, ArrowRight, ArrowLeft, 
  Trophy, Sparkles, Brain, Award, ShieldAlert, Zap, Bot, Send, 
  CheckCircle, AlertTriangle, Lightbulb, RefreshCw
} from 'lucide-react';

export default function PracticeModePage({ params }) {
  const { id } = params;

  const [cards, setCards] = useState([]);
  const [stats, setStats] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastRatingSaved, setLastRatingSaved] = useState(null);

  // AI Answer Evaluator state
  const [answers, setAnswers] = useState({});
  const [evaluating, setEvaluating] = useState(false);
  const [evaluations, setEvaluations] = useState({});
  const [evalError, setEvalError] = useState(null);

  useEffect(() => {
    fetchPracticeDeck();
  }, [id]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setRevealed(prev => !prev);
      } else if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code) && revealed) {
        const rating = parseInt(e.code.replace('Digit', ''), 10);
        handleRateConfidence(rating);
      } else if (e.code === 'ArrowRight' && currentIndex + 1 < cards.length) {
        setRevealed(false);
        setCurrentIndex(prev => prev + 1);
      } else if (e.code === 'ArrowLeft' && currentIndex > 0) {
        setRevealed(false);
        setCurrentIndex(prev => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealed, currentIndex, cards.length]);

  const fetchPracticeDeck = async () => {
    try {
      const res = await fetch(`/api/practice/${id}`);
      const data = await res.json();
      if (data.success) {
        setCards(data.flashcards || []);
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error('Failed to load practice deck:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRateConfidence = async (rating) => {
    if (!cards[currentIndex]) return;
    const currentCard = cards[currentIndex];

    setLastRatingSaved(rating);
    setTimeout(() => setLastRatingSaved(null), 1500);

    try {
      await fetch(`/api/practice/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: currentCard.id,
          confidenceRating: rating
        })
      });

      // Advance to next card
      setRevealed(false);
      if (currentIndex + 1 < cards.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Reload deck to re-sort by lowest confidence (spaced-repetition)
        fetchPracticeDeck();
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error('Failed to submit confidence rating:', err);
    }
  };

  const handleEvaluateAnswer = async () => {
    const card = cards[currentIndex];
    if (!card) return;
    const answer = answers[card.id] || '';
    if (!answer.trim()) {
      setEvalError('Please type your answer above before requesting an evaluation.');
      return;
    }

    setEvaluating(true);
    setEvalError(null);

    try {
      const res = await fetch('/api/ai/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: card.front,
          userAnswer: answer,
          category: 'technical',
          roleContext: 'Software Engineering candidate'
        })
      });

      const data = await res.json();
      if (data.success && data.evaluation) {
        setEvaluations(prev => ({ ...prev, [card.id]: data.evaluation }));
        // Automatically reveal card criteria after receiving AI evaluation
        setRevealed(true);
      } else {
        setEvalError(data.error || 'Evaluation failed. Please try again.');
      }
    } catch (err) {
      setEvalError('Network error during evaluation: ' + err.message);
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto animate-pulse">
          <Brain className="w-6 h-6" />
        </div>
        <p className="text-slate-400 text-sm font-medium">Loading Spaced-Repetition Practice Runner...</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="glass-panel p-12 text-center space-y-4 max-w-md mx-auto">
        <BookOpen className="w-12 h-12 text-sky-400 mx-auto" />
        <h3 className="text-xl font-bold text-white">No Flashcards In This Kit</h3>
        <p className="text-xs text-slate-400">Return to the Kit Builder to view or add flashcards.</p>
        <Link href={`/kit/${id}`} className="inline-block px-5 py-2.5 bg-sky-600 text-white font-bold text-xs rounded-xl">
          Return to Kit Builder
        </Link>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPercent = stats ? Math.round((stats.covered / Math.max(1, stats.total)) * 100) : 0;
  const currentEvaluation = evaluations[currentCard?.id];

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="badge-pill bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-mono text-xs uppercase">
              <Zap className="w-3.5 h-3.5" />
              Spaced-Repetition Deck
            </span>
            <span className="badge-pill bg-slate-800 text-slate-300 font-mono text-xs">
              Card {currentIndex + 1} of {cards.length}
            </span>
            <span className="badge-pill bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono text-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              AI Evaluator Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Interactive Practice Mode</h1>
        </div>

        <Link 
          href={`/kit/${id}`} 
          className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Kit Builder</span>
        </Link>
      </div>

      {/* Progress & Deck Stats HUD */}
      {stats && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">Mastery Progress: {progressPercent}%</span>
            <span className="font-mono text-slate-400">
              Covered: <strong className="text-emerald-400">{stats.covered}</strong> / {stats.total} Cards
            </span>
          </div>

          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1 text-center">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Covered</span>
              <span className="text-lg font-extrabold text-emerald-400">{stats.covered}</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Unreviewed</span>
              <span className="text-lg font-extrabold text-amber-400">{stats.uncovered}</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Deck Order</span>
              <span className="text-xs font-bold text-sky-400 block mt-1">Lowest Confidence First</span>
            </div>
          </div>
        </div>
      )}

      {/* Flashcard Main Stage */}
      <div className="glass-panel p-8 sm:p-12 text-center space-y-8 min-h-[360px] flex flex-col justify-between border-2 border-sky-500/25 relative overflow-hidden shadow-2xl">
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card Front */}
        <div className="space-y-4 relative">
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-400 bg-slate-900 border border-white/5 px-2.5 py-1 rounded-md">
              {currentCard.id}
            </span>
            <span className="badge-pill bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono text-[11px]">
              Reqs: {(currentCard.requirement_ids || []).join(', ')}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-relaxed tracking-tight max-w-xl mx-auto">
            {currentCard.front}
          </h2>
        </div>

        {/* AI Answer Input Box */}
        <div className="text-left space-y-3 bg-[#060a14]/90 p-5 rounded-2xl border border-white/10 relative">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-400" />
              <span>Practice Your Answer (AI Evaluated):</span>
            </label>
            <span className="text-[10px] font-mono text-slate-500">Gemini 2.5 Flash</span>
          </div>

          <textarea
            rows={3}
            value={answers[currentCard.id] || ''}
            onChange={(e) => setAnswers(prev => ({ ...prev, [currentCard.id]: e.target.value }))}
            placeholder="Type your explanation or thoughts here as you would in an interview..."
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />

          {evalError && (
            <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{evalError}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">
              Type your answer to receive automated scoring and feedback.
            </span>
            <button
              onClick={handleEvaluateAnswer}
              disabled={evaluating}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
            >
              {evaluating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Evaluate with AI</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI Evaluation Assessment Result */}
        {currentEvaluation && (
          <div className="p-6 bg-gradient-to-b from-[#0a1228] to-[#060a14] rounded-2xl border border-indigo-500/30 text-left space-y-4 animate-in fade-in duration-300 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="badge-pill bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold text-xs uppercase flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                  AI Evaluation
                </span>
                <span className={`badge-pill text-xs font-extrabold ${
                  currentEvaluation.score >= 8 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                  currentEvaluation.score >= 6 ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' :
                  'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  Score: {currentEvaluation.score}/10 ({currentEvaluation.grade || 'Evaluated'})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-2">
                <strong className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Key Strengths
                </strong>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  {(currentEvaluation.strengths || []).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              <div className="p-3.5 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-2">
                <strong className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Areas to Polish
                </strong>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  {(currentEvaluation.improvements || []).map((imp, i) => (
                    <li key={i}>{imp}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Model Answer */}
            {currentEvaluation.model_answer && (
              <div className="p-4 bg-slate-900/90 border border-white/10 rounded-xl space-y-1.5">
                <span className="text-[11px] font-mono font-bold text-sky-400 uppercase">Model Exemplar Answer:</span>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">{currentEvaluation.model_answer}</p>
              </div>
            )}

            {/* Pro Tip */}
            {currentEvaluation.tip && (
              <div className="flex items-start gap-2.5 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-200">
                <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-white">Interview Delivery Tip: </strong>
                  <span>{currentEvaluation.tip}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Card Back / Answer Criteria Area */}
        {revealed ? (
          <div className="p-6 sm:p-8 bg-[#060a14] rounded-2xl border border-white/10 space-y-4 text-left animate-in fade-in duration-300 relative shadow-inner">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Key Concept & Answer Outline
              </span>
              <span className="text-[10px] font-mono text-slate-500">Press 1-5 to rate</span>
            </div>

            <p className="text-sm text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">
              {currentCard.back}
            </p>
          </div>
        ) : (
          <div className="py-4">
            <button
              onClick={() => setRevealed(true)}
              className="py-3.5 px-7 bg-gradient-to-r from-sky-600 via-sky-500 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-xl shadow-sky-600/30 inline-flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95"
            >
              <Eye className="w-4 h-4" />
              <span>Reveal Key Answer Criteria</span>
            </button>
            <p className="text-[11px] text-slate-500 mt-2 font-mono">Or press [Space] on your keyboard</p>
          </div>
        )}

        {/* Confidence Rating Stars (1 to 5) */}
        {revealed && (
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-bold text-slate-300">Rate your confidence for spaced repetition:</span>
            </div>

            <div className="grid grid-cols-5 gap-2 max-w-lg mx-auto">
              {[
                { star: 1, label: 'Needs Work', color: 'hover:border-rose-500 hover:text-rose-400' },
                { star: 2, label: 'Shaky', color: 'hover:border-amber-500 hover:text-amber-400' },
                { star: 3, label: 'Fair', color: 'hover:border-yellow-500 hover:text-yellow-400' },
                { star: 4, label: 'Good', color: 'hover:border-sky-500 hover:text-sky-400' },
                { star: 5, label: 'Mastered', color: 'hover:border-emerald-500 hover:text-emerald-400' }
              ].map(item => (
                <button
                  key={item.star}
                  onClick={() => handleRateConfidence(item.star)}
                  className={`p-3 bg-slate-900/90 border border-white/10 rounded-2xl text-xs font-bold text-slate-200 transition-all flex flex-col items-center gap-1.5 hover:scale-105 ${item.color}`}
                >
                  <div className="flex items-center gap-0.5">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-white font-mono">{item.star}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-between items-center text-xs">
        <button
          onClick={() => {
            setRevealed(false);
            setCurrentIndex(Math.max(0, currentIndex - 1));
          }}
          disabled={currentIndex === 0}
          className="px-4 py-2.5 bg-slate-900 text-slate-300 border border-white/5 rounded-xl hover:text-white disabled:opacity-40 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <button
          onClick={() => fetchPracticeDeck()}
          className="text-slate-400 hover:text-sky-400 flex items-center gap-1.5 transition-colors font-medium"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Resort Deck by Confidence</span>
        </button>

        <button
          onClick={() => {
            setRevealed(false);
            setCurrentIndex(Math.min(cards.length - 1, currentIndex + 1));
          }}
          disabled={currentIndex === cards.length - 1}
          className="px-4 py-2.5 bg-slate-900 text-slate-300 border border-white/5 rounded-xl hover:text-white disabled:opacity-40 flex items-center gap-1.5"
        >
          <span>Next</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
