'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BookOpen, Calendar, ShieldCheck, Trash2, ArrowRight, Sparkles, 
  BrainCircuit, Plus, Building2, Clock, CheckCircle2 
} from 'lucide-react';

export default function DashboardPage() {
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKits();
  }, []);

  const fetchKits = async () => {
    try {
      const res = await fetch('/api/kits');
      const data = await res.json();
      if (data.success) {
        setKits(data.kits || []);
      }
    } catch (err) {
      console.error('Failed to fetch kits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, companyName) => {
    if (confirm(`Delete interview preparation kit for ${companyName}?`)) {
      try {
        await fetch(`/api/kits/${id}`, { method: 'DELETE' });
        fetchKits();
      } catch (err) {
        alert('Failed to delete kit');
      }
    }
  };

  const totalQuestions = kits.reduce((acc, k) => acc + (k.questions?.length || 0), 0);
  const totalCards = kits.reduce((acc, k) => acc + (k.flashcards?.length || 0), 0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      {/* Header Bar */}
      <div className="glass-panel p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-pill bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-mono font-bold">
              User Kit Library
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Your Interview Kits</h1>
          <p className="text-sm text-slate-400 mt-1">Manage, edit, regenerate, and practise against your personalized interview kits.</p>
        </div>

        <Link 
          href="/" 
          className="px-5 py-3 bg-gradient-to-r from-sky-600 via-sky-500 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-all hover:-translate-y-0.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Kit</span>
        </Link>
      </div>

      {/* Stats Summary Strip */}
      {kits.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Prep Kits</span>
            <h4 className="text-2xl font-extrabold text-white">{kits.length} Roles</h4>
          </div>
          <div className="glass-card p-5 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Curated Questions</span>
            <h4 className="text-2xl font-extrabold text-sky-400">{totalQuestions} Questions</h4>
          </div>
          <div className="glass-card p-5 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Flashcard Deck Items</span>
            <h4 className="text-2xl font-extrabold text-emerald-400">{totalCards} Flashcards</h4>
          </div>
        </div>
      )}

      {/* Kit Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-sky-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-medium">Loading your preparation kits...</p>
        </div>
      ) : kits.length === 0 ? (
        <div className="glass-panel p-16 text-center space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto mb-2 border border-sky-500/20">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">No Interview Kits Generated Yet</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Paste any job description and company URL on the home generator to build your first tailored kit.
          </p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-600/25 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>Generate First Kit</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {kits.map(kit => {
            const company = kit.source?.company || 'Target Company';
            const role = kit.role?.title || 'Software Engineer';
            const reqCount = kit.role?.requirements?.length || 0;
            const qCount = kit.questions?.length || 0;
            const flashcardCount = kit.flashcards?.length || 0;
            const days = kit.schedule?.days_available || 5;
            const passes = kit.coverage?.passes || 1;

            return (
              <div 
                key={kit.id || kit._id} 
                className="glass-panel p-6 sm:p-7 space-y-5 flex flex-col justify-between hover:border-sky-500/30 transition-all group"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="badge-pill bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-mono font-bold">
                        <Building2 className="w-3 h-3" />
                        {company}
                      </span>
                      <h3 className="text-xl font-extrabold text-white mt-1 group-hover:text-sky-300 transition-colors">
                        {role}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono truncate max-w-sm">
                        {kit.source?.company_url || 'URL N/A'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDelete(kit.id || kit._id, company)}
                      className="text-slate-500 hover:text-rose-400 p-2 rounded-xl hover:bg-rose-500/10 transition-colors"
                      title="Delete Kit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Badges Info */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="flex items-center gap-1.5 bg-[#060a14] px-3 py-1.5 rounded-lg border border-white/5 text-slate-300 font-mono">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span>{days} Days Plan</span>
                    </span>

                    <span className="flex items-center gap-1.5 bg-[#060a14] px-3 py-1.5 rounded-lg border border-white/5 text-slate-300 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Pass {passes} Verified</span>
                    </span>

                    <span className="flex items-center gap-1.5 bg-[#060a14] px-3 py-1.5 rounded-lg border border-white/5 text-slate-300 font-mono">
                      <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{reqCount} Reqs &bull; {qCount} Qs</span>
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/[0.08]">
                  <Link
                    href={`/kit/${kit.id || kit._id}`}
                    className="flex-1 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 transition-all hover:-translate-y-0.5"
                  >
                    <span>Reshape Builder</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    href={`/practice/${kit.id || kit._id}`}
                    className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-white/10 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Practise ({flashcardCount})</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
