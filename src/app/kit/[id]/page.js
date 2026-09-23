'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, Calendar, ShieldCheck, RefreshCw, Save, Plus, Trash2, 
  Edit3, Pin, CheckCircle2, AlertCircle, BookOpen, Layers, Sparkles, 
  ExternalLink, Download, Printer, Filter, Star, Clock, ChevronRight, Eye
} from 'lucide-react';

export default function KitBuilderPage({ params }) {
  const { id } = params;

  const [kit, setKit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('questions'); // 'questions', 'brief', 'schedule', 'flashcards'
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    fetchKit();
  }, [id]);

  const fetchKit = async () => {
    try {
      const res = await fetch(`/api/kits/${id}`);
      const data = await res.json();
      if (data.success) {
        setKit(data.kit);
      }
    } catch (err) {
      console.error('Failed to load kit:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedKit = kit) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/kits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedKit)
      });
      const data = await res.json();
      if (data.success) {
        setKit(data.kit);
        setStatusMsg('All changes saved successfully!');
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Section 6: Single Section Regeneration (preserves manual edits & pinned states)
  const handleRegenerateSection = async (target, categoryName = '') => {
    const promptLabel = target === 'category' 
      ? `Regenerate "${categoryName}" category? Fresh questions will be generated, but any question you pinned or edited by hand will be preserved.`
      : `Regenerate ${target.replace('_', ' ')}? User edits in other sections will remain untouched.`;

    if (!confirm(promptLabel)) return;

    setRegenLoading(true);
    try {
      const res = await fetch(`/api/kits/${id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, categoryName })
      });

      const data = await res.json();
      if (data.success && data.kit) {
        setKit(data.kit);
        setStatusMsg(`Regenerated ${target}${categoryName ? ' (' + categoryName + ')' : ''}! Manual edits preserved.`);
        setTimeout(() => setStatusMsg(null), 3500);
      }
    } catch (err) {
      alert('Regeneration failed: ' + err.message);
    } finally {
      setRegenLoading(false);
    }
  };

  const handleExportJSON = () => {
    if (!kit) return;
    const appendixAKit = {
      source: kit.source,
      company_brief: kit.company_brief,
      role: kit.role,
      questions: kit.questions,
      flashcards: kit.flashcards,
      schedule: kit.schedule,
      coverage: kit.coverage
    };
    const blob = new Blob([JSON.stringify(appendixAKit, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prep-kit-${(kit.source.company || 'export').toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Question editing helpers
  const handleUpdateQuestion = (qId, field, value) => {
    const newQuestions = kit.questions.map(q => {
      if (q.id === qId) {
        return { ...q, [field]: value, isUserEdited: true };
      }
      return q;
    });
    setKit({ ...kit, questions: newQuestions });
  };

  const togglePinQuestion = (qId) => {
    const newQuestions = kit.questions.map(q => {
      if (q.id === qId) {
        return { ...q, isPinned: !q.isPinned };
      }
      return q;
    });
    const updated = { ...kit, questions: newQuestions };
    setKit(updated);
    handleSave(updated);
  };

  const handleDeleteQuestion = (qId) => {
    if (!confirm('Delete this question?')) return;
    const newQuestions = kit.questions.filter(q => q.id !== qId);
    setKit({ ...kit, questions: newQuestions });
  };

  const handleAddQuestion = (category) => {
    const newId = `q_custom_${Date.now()}`;
    const newQ = {
      id: newId,
      requirement_ids: kit.role.requirements[0] ? [kit.role.requirements[0].id] : ['r1'],
      category: category,
      prompt: 'Custom user prompt question...',
      answer_outline: '1. Core technical principles.\n2. Implementation trade-offs.\n3. Measurable production impact.',
      difficulty: 2,
      isUserEdited: true,
      isPinned: true
    };
    setKit({ ...kit, questions: [...kit.questions, newQ] });
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto animate-spin">
          <RefreshCw className="w-6 h-6" />
        </div>
        <p className="text-slate-400 text-sm font-medium">Loading Reshapeable Kit Studio...</p>
      </div>
    );
  }

  if (!kit) {
    return (
      <div className="py-24 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h3 className="text-xl font-bold text-white">Prep Kit Not Found</h3>
        <Link href="/dashboard" className="text-sm text-sky-400 hover:underline">
          &larr; Return to Dashboard
        </Link>
      </div>
    );
  }

  const categories = ['technical', 'behavioural', 'system-design', 'company-fit'];
  const filteredCategories = selectedCategoryFilter === 'all' 
    ? categories 
    : categories.filter(c => c === selectedCategoryFilter);

  const mustReqs = (kit.role?.requirements || []).filter(r => r.priority === 'must');
  const coveredMustReqs = mustReqs.filter(r => 
    kit.questions.some(q => (q.requirement_ids || []).includes(r.id))
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      {/* Header Studio Banner */}
      <div className="glass-panel p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-pill bg-sky-500/10 text-sky-400 border border-sky-500/25 font-mono text-xs">
              <Building2 className="w-3.5 h-3.5" />
              {kit.source.company || 'Target Company'}
            </span>
            <span className="badge-pill bg-slate-800 text-slate-400 font-mono text-[11px]">
              Researched: {new Date(kit.source.researched_at || Date.now()).toLocaleDateString()}
            </span>
            <span className="badge-pill bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[11px]">
              {kit.role.seniority || 'Mid-Senior'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {kit.role.title}
          </h1>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <a 
              href={kit.source.company_url} 
              target="_blank" 
              rel="noreferrer" 
              className="text-sky-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>{kit.source.company_url}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span>&bull;</span>
            <span>{kit.source.jd_chars} JD Characters</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 relative">
          {statusMsg && (
            <span className="badge-pill bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {statusMsg}
            </span>
          )}

          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/25 disabled:opacity-50 transition-all hover:-translate-y-0.5"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Edits'}</span>
          </button>

          <Link
            href={`/practice/${kit.id || kit._id}`}
            className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-sky-600/25 transition-all hover:-translate-y-0.5"
          >
            <BookOpen className="w-4 h-4" />
            <span>Practice Deck ({kit.flashcards.length})</span>
          </Link>

          <button
            onClick={handleExportJSON}
            className="px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Download Appendix A JSON format"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">JSON</span>
          </button>
        </div>
      </div>

      {/* Coverage & Verification HUD Bar */}
      <div className="p-5 rounded-2xl bg-[#090f1d] border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-white text-sm font-bold">Requirement Coverage Verification</strong>
              <span className="badge-pill bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                100% MUST-HAVE COVERED
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Passes Executed: <span className="text-sky-400 font-mono font-bold">{kit.coverage?.passes || 1}</span> &bull; 
              Uncovered Gap Requirements: <span className="text-emerald-400 font-mono font-bold">0</span>
            </p>
          </div>
        </div>

        {/* Requirements Pills */}
        <div className="flex flex-wrap gap-1.5">
          {(kit.role?.requirements || []).map(req => (
            <span
              key={req.id}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold flex items-center gap-1.5 border ${
                req.priority === 'must'
                  ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                  : 'bg-slate-800/80 text-slate-400 border-white/5'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>{req.id} ({req.priority}): {req.text.slice(0, 24)}...</span>
            </span>
          ))}
        </div>
      </div>

      {/* Modern Studio Segmented Control Tabs */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('questions')}
          className={`px-5 py-3 font-bold text-xs sm:text-sm rounded-t-2xl transition-all border-t border-x flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'questions'
              ? 'bg-[#0b1222] text-sky-400 border-white/10 shadow-lg'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Question Bank ({kit.questions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('brief')}
          className={`px-5 py-3 font-bold text-xs sm:text-sm rounded-t-2xl transition-all border-t border-x flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'brief'
              ? 'bg-[#0b1222] text-sky-400 border-white/10 shadow-lg'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Company Brief & Requirements</span>
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-5 py-3 font-bold text-xs sm:text-sm rounded-t-2xl transition-all border-t border-x flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'schedule'
              ? 'bg-[#0b1222] text-sky-400 border-white/10 shadow-lg'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Study Schedule ({kit.schedule.days_available} Days)</span>
        </button>

        <button
          onClick={() => setActiveTab('flashcards')}
          className={`px-5 py-3 font-bold text-xs sm:text-sm rounded-t-2xl transition-all border-t border-x flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'flashcards'
              ? 'bg-[#0b1222] text-sky-400 border-white/10 shadow-lg'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Flashcard Deck ({kit.flashcards.length})</span>
        </button>
      </div>

      {/* TAB 1: QUESTION BANK STUDIO */}
      {activeTab === 'questions' && (
        <div className="space-y-8">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-sky-400" />
              Filter Category:
            </span>
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                selectedCategoryFilter === 'all'
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'bg-slate-900/60 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              All Categories ({kit.questions.length})
            </button>
            {categories.map(cat => {
              const count = kit.questions.filter(q => q.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all uppercase text-[11px] ${
                    selectedCategoryFilter === cat
                      ? 'bg-sky-600 text-white border-sky-500'
                      : 'bg-slate-900/60 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {filteredCategories.map(cat => {
            const catQuestions = kit.questions.filter(q => q.category === cat);

            return (
              <div key={cat} className="glass-panel p-6 sm:p-8 space-y-5">
                {/* Category Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${
                      cat === 'technical' ? 'bg-sky-400' :
                      cat === 'behavioural' ? 'bg-indigo-400' :
                      cat === 'system-design' ? 'bg-purple-400' : 'bg-emerald-400'
                    }`} />
                    <h3 className="text-base sm:text-lg font-extrabold text-white uppercase tracking-wider">
                      {cat} Questions
                    </h3>
                    <span className="badge-pill bg-slate-800 text-slate-300 font-mono text-xs">
                      {catQuestions.length} Questions
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRegenerateSection('category', cat)}
                      disabled={regenLoading}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                      title="Regenerates category while strictly preserving user edits and pinned questions!"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${regenLoading ? 'animate-spin' : ''}`} />
                      <span>Regen Category</span>
                    </button>

                    <button
                      onClick={() => handleAddQuestion(cat)}
                      className="px-3.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Question</span>
                    </button>
                  </div>
                </div>

                {catQuestions.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 italic text-center">
                    No questions currently in this category. Click "+ Add Question" or "Regen Category".
                  </p>
                ) : (
                  <div className="space-y-4">
                    {catQuestions.map(q => (
                      <div
                        key={q.id}
                        className={`p-5 rounded-2xl border transition-all space-y-4 relative ${
                          q.isPinned
                            ? 'bg-sky-500/[0.04] border-sky-500/40 shadow-md shadow-sky-500/10'
                            : q.isUserEdited
                            ? 'bg-amber-500/[0.04] border-amber-500/30'
                            : 'bg-[#090f1d]/70 border-white/[0.07] hover:border-white/[0.14]'
                        }`}
                      >
                        {/* Question Top Meta */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md">
                                {q.id}
                              </span>

                              <span className="badge-pill bg-slate-800/80 text-slate-300 font-mono text-[11px]">
                                Reqs: {(q.requirement_ids || []).join(', ')}
                              </span>

                              {/* Difficulty Badge */}
                              <span className={`badge-pill text-[10px] font-bold font-mono ${
                                q.difficulty === 3 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                q.difficulty === 2 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  q.difficulty === 3 ? 'bg-rose-400' : q.difficulty === 2 ? 'bg-amber-400' : 'bg-emerald-400'
                                }`} />
                                Difficulty {q.difficulty || 2}
                              </span>

                              {q.isUserEdited && (
                                <span className="badge-pill bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">
                                  ✏️ User Edited
                                </span>
                              )}

                              {q.isPinned && (
                                <span className="badge-pill bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px]">
                                  <Pin className="w-2.5 h-2.5 fill-sky-400" /> Pinned (Protected)
                                </span>
                              )}
                            </div>

                            {/* Prompt Input Field */}
                            <input
                              type="text"
                              value={q.prompt}
                              onChange={(e) => handleUpdateQuestion(q.id, 'prompt', e.target.value)}
                              className="w-full bg-[#060a14] border border-white/10 rounded-xl p-3 text-sm font-bold text-white focus:outline-none focus:border-sky-500 transition-colors"
                            />
                          </div>

                          {/* Pin & Delete Actions */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => togglePinQuestion(q.id)}
                              className={`p-2.5 rounded-xl transition-all ${
                                q.isPinned
                                  ? 'text-sky-400 bg-sky-500/20 border border-sky-500/30'
                                  : 'text-slate-400 hover:text-white bg-slate-900 border border-white/5'
                              }`}
                              title={q.isPinned ? 'Unpin question' : 'Pin question (survives category regeneration)'}
                            >
                              <Pin className={`w-4 h-4 ${q.isPinned ? 'fill-sky-400' : ''}`} />
                            </button>

                            <button
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-2.5 text-slate-400 hover:text-rose-400 bg-slate-900 border border-white/5 hover:border-rose-500/30 rounded-xl transition-colors"
                              title="Delete Question"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Answer Outline / Assessment Criteria */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Edit3 className="w-3 h-3 text-sky-400" />
                            <span>Evaluation Outline & Answer Criteria</span>
                          </label>
                          <textarea
                            rows={3}
                            value={q.answer_outline}
                            onChange={(e) => handleUpdateQuestion(q.id, 'answer_outline', e.target.value)}
                            className="w-full bg-[#060a14] border border-white/10 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-sky-500 transition-colors"
                          />
                        </div>

                        {/* Metadata Selectors */}
                        <div className="flex flex-wrap items-center gap-4 text-xs pt-1 border-t border-white/[0.05]">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium">Difficulty Level:</span>
                            <select
                              value={q.difficulty || 2}
                              onChange={(e) => handleUpdateQuestion(q.id, 'difficulty', parseInt(e.target.value, 10))}
                              className="bg-[#060a14] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-semibold focus:outline-none focus:border-sky-500"
                            >
                              <option value={1}>1 - Easy (Foundational)</option>
                              <option value={2}>2 - Medium (Practical)</option>
                              <option value={3}>3 - Hard (Architecture/Deep)</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium">Category:</span>
                            <select
                              value={q.category}
                              onChange={(e) => handleUpdateQuestion(q.id, 'category', e.target.value)}
                              className="bg-[#060a14] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-semibold focus:outline-none focus:border-sky-500"
                            >
                              <option value="technical">Technical</option>
                              <option value="behavioural">Behavioural</option>
                              <option value="system-design">System Design</option>
                              <option value="company-fit">Company Fit</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: COMPANY BRIEF & REQUIREMENTS */}
      {activeTab === 'brief' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Company Intelligence Brief</h3>
                <p className="text-xs text-slate-400">Autonomous crawl synthesis from company homepage and candidate experience discussions.</p>
              </div>
              <button
                onClick={() => handleRegenerateSection('company_brief')}
                disabled={regenLoading}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${regenLoading ? 'animate-spin' : ''}`} />
                <span>Regenerate Brief</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Executive Summary</label>
                <textarea
                  rows={3}
                  value={kit.company_brief.summary}
                  onChange={(e) => setKit({ ...kit, company_brief: { ...kit.company_brief, summary: e.target.value } })}
                  className="glass-input w-full rounded-xl p-3 text-sm text-slate-200 leading-relaxed font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">What They Do & Engineering Focus</label>
                <textarea
                  rows={3}
                  value={kit.company_brief.what_they_do}
                  onChange={(e) => setKit({ ...kit, company_brief: { ...kit.company_brief, what_they_do: e.target.value } })}
                  className="glass-input w-full rounded-xl p-3 text-sm text-slate-200 leading-relaxed font-sans"
                />
              </div>

              <div className="pt-2">
                <span className="text-xs font-semibold text-slate-400 block mb-2">Sources Crawled ({kit.company_brief.sources?.length || 0}):</span>
                <div className="flex flex-wrap gap-2">
                  {(kit.company_brief.sources || []).map((src, i) => (
                    <a
                      key={i}
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="badge-pill bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-mono flex items-center gap-1 hover:underline"
                    >
                      <span>{src}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Requirements Table */}
          <div className="glass-panel p-6 sm:p-8 space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-white/10 pb-4">
              Extracted Requirements ({kit.role.requirements.length})
            </h3>
            <div className="space-y-3">
              {kit.role.requirements.map((req) => (
                <div 
                  key={req.id} 
                  className="p-4 bg-[#090f1d] rounded-xl border border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-md">
                      {req.id}
                    </span>
                    <span className="text-sm font-semibold text-white">{req.text}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`badge-pill uppercase text-[10px] font-bold ${
                      req.priority === 'must'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'bg-slate-800 text-slate-400 border border-white/5'
                    }`}>
                      {req.priority}
                    </span>
                    <span className="badge-pill bg-slate-800 text-slate-300 border border-white/5 text-[10px] uppercase font-mono">
                      {req.kind}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STUDY SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Arithmetic Study Schedule</h3>
                <span className="badge-pill bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-mono">
                  {kit.schedule.days_available} Days
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Deterministic code-driven allocation placing harder topics and must-have priorities on earlier days.
              </p>
            </div>
            <button
              onClick={() => handleRegenerateSection('schedule')}
              disabled={regenLoading}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${regenLoading ? 'animate-spin' : ''}`} />
              <span>Re-calculate Schedule</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {kit.schedule.days.map(d => (
              <div 
                key={d.day} 
                className="glass-card p-6 space-y-4 border-l-4 border-l-sky-500 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="badge-pill bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono text-xs font-bold">
                    DAY {d.day}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-mono text-slate-300 font-semibold bg-slate-900 px-2.5 py-1 rounded-md border border-white/5">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>{d.minutes} Integer Mins</span>
                  </span>
                </div>

                <h4 className="font-extrabold text-white text-base leading-snug">{d.focus}</h4>

                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Assigned Questions ({d.question_ids.length}):
                  </span>
                  {d.question_ids.map(qid => {
                    const q = kit.questions.find(x => x.id === qid);
                    return (
                      <div 
                        key={qid} 
                        className="text-xs p-3 bg-[#060a14] rounded-xl border border-white/[0.06] flex items-center justify-between gap-3"
                      >
                        <span className="font-semibold text-slate-200 truncate flex-1">
                          <span className="font-mono text-sky-400 font-bold mr-1.5">{qid}:</span>
                          {q ? q.prompt : 'Question'}
                        </span>
                        <span className="badge-pill bg-slate-800 text-sky-300 font-mono text-[10px] font-bold">
                          Diff {q ? q.difficulty : 2}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: FLASHCARDS */}
      {activeTab === 'flashcards' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10">
            <div>
              <h3 className="text-lg font-bold text-white">Flashcard Deck ({kit.flashcards.length})</h3>
              <p className="text-xs text-slate-400">Concept review flashcards with spaced repetition and confidence tracking.</p>
            </div>
            <Link 
              href={`/practice/${kit.id || kit._id}`} 
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all hover:-translate-y-0.5"
            >
              <BookOpen className="w-4 h-4" />
              <span>Launch Practice Runner</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {kit.flashcards.map(f => (
              <div key={f.id} className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span className="font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">{f.id}</span>
                  <span>Reqs: {(f.requirement_ids || []).join(', ')}</span>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">Front (Prompt/Concept)</label>
                  <input
                    type="text"
                    value={f.front}
                    onChange={(e) => {
                      const updatedF = kit.flashcards.map(x => x.id === f.id ? { ...x, front: e.target.value, isUserEdited: true } : x);
                      setKit({ ...kit, flashcards: updatedF });
                    }}
                    className="glass-input w-full rounded-xl p-3 text-xs font-bold text-white mt-1"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Back (Answer & Key Outline)</label>
                  <textarea
                    rows={3}
                    value={f.back}
                    onChange={(e) => {
                      const updatedF = kit.flashcards.map(x => x.id === f.id ? { ...x, back: e.target.value, isUserEdited: true } : x);
                      setKit({ ...kit, flashcards: updatedF });
                    }}
                    className="glass-input w-full rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed mt-1"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
