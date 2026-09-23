'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, Building2, Calendar, FileText, Upload, ArrowRight, CheckCircle2, 
  Loader2, AlertCircle, ShieldCheck, Globe, Zap, Search, Layers, Cpu, Compass
} from 'lucide-react';

const PRESETS = [
  {
    label: 'PostHog • Senior Backend',
    company_url: 'https://posthog.com',
    days: 5,
    jd: `Senior Backend Engineer
We are looking for a Senior Node.js Engineer with 5+ years of experience building microservices, REST APIs, and working with MongoDB and AWS. Strong experience with Docker, CI/CD pipelines, and mentoring junior engineers is required. Bonus points for Next.js knowledge.`
  },
  {
    label: 'GitLab • Senior Frontend',
    company_url: 'https://gitlab.com',
    days: 3,
    jd: `Frontend React Developer
Must have 3+ years experience with React, TypeScript, and Tailwind CSS. Experience with modern state management, micro-frontends, and unit testing is required. Bonus points for GraphQL experience.`
  },
  {
    label: 'Stripe • Infrastructure Architect',
    company_url: 'https://stripe.com',
    days: 7,
    jd: `Staff Distributed Systems Engineer
Minimum 6+ years experience in high-throughput distributed systems, event-driven architectures (Kafka), database partitioning, and fault-tolerant cloud architecture. Strong communication and cross-functional leadership required.`
  }
];

export default function HomePage() {
  const router = useRouter();

  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(5);
  const [mode, setMode] = useState('single'); // 'single' or 'batch'

  const [batchFile, setBatchFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepText, setStepText] = useState('');
  const [error, setError] = useState(null);

  const stepsList = [
    'Autonomous Web Crawler: Scanning domain & discovering hiring pages...',
    'Requirement Extraction: Classifying must-have vs nice-to-have topics...',
    'Question Generation: Tailoring technical, behavioural & system-design rounds...',
    'Second-Pass Loop: Deterministic coverage check & gap resolution...',
    'Arithmetic Scheduler: Code-driven distribution across available days...'
  ];

  const handleApplyPreset = (preset) => {
    setJd(preset.jd);
    setCompanyUrl(preset.company_url);
    setDays(preset.days);
    setError(null);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!jd.trim() && !companyUrl.trim()) {
      setError('Please provide a job description or company URL to begin.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Step simulation indicators
      setCurrentStep(0);
      setStepText(stepsList[0]);
      await new Promise(r => setTimeout(r, 650));

      setCurrentStep(1);
      setStepText(stepsList[1]);
      await new Promise(r => setTimeout(r, 700));

      setCurrentStep(2);
      setStepText(stepsList[2]);
      await new Promise(r => setTimeout(r, 700));

      setCurrentStep(3);
      setStepText(stepsList[3]);
      await new Promise(r => setTimeout(r, 600));

      setCurrentStep(4);
      setStepText(stepsList[4]);

      const res = await fetch('/api/kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jd: jd.trim(),
          company_url: companyUrl.trim(),
          days: parseInt(days, 10) || 5
        })
      });

      const data = await res.json();
      if (data.success && data.kit) {
        router.push(`/kit/${data.kit.id || data.kit._id}`);
      } else {
        setError(data.error || 'Failed to generate kit.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Error executing pipeline.');
      setLoading(false);
    }
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    if (!batchFile) {
      setError('Please select a batch JSON file containing description-and-company pairs.');
      return;
    }

    setLoading(true);
    setError(null);
    setStepText('Parsing batch cases and executing concurrent research pipelines...');

    try {
      const text = await batchFile.text();
      const pairs = JSON.parse(text);

      const res = await fetch('/api/kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairs })
      });

      const data = await res.json();
      if (data.success && data.kits && data.kits.length > 0) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Batch processing failed.');
        setLoading(false);
      }
    } catch (err) {
      setError('Invalid JSON batch file format: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      {/* Hero Section */}
      <div className="text-center space-y-6 pt-4 sm:pt-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-emerald-500/10 border border-white/10 text-sky-300 text-xs font-bold tracking-wide uppercase shadow-inner">
          <Sparkles className="w-4 h-4 text-sky-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Trao Full-Stack Engineering Assessment &bull; FS-AI-INTERVIEW-01</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
          Turn Any Job Posting Into A <br />
          <span className="gradient-text-shimmer">
            Personalised Interview Prep Kit
          </span>
        </h1>

        <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto font-normal leading-relaxed">
          Autonomous company web crawler, deterministic requirement extraction, second-pass coverage verification, and arithmetic day-by-day study scheduling.
        </p>

        {/* Quick Presets Chips */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Quick Test Cases:
          </span>
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(p)}
              className="text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-white/10 hover:border-sky-500/30 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>{p.label}</span>
              <span className="text-[10px] font-mono text-sky-400/80 font-bold">({p.days}d)</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex justify-center">
        <div className="bg-[#0b1222] p-1.5 rounded-2xl border border-white/10 flex gap-2 shadow-xl shadow-black/40">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              mode === 'single'
                ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Single Role Generator</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('batch')}
            className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              mode === 'batch'
                ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Batch Pairs Ingestion</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Main Interactive Form Card */}
      {mode === 'single' ? (
        <form onSubmit={handleGenerate} className="glass-panel p-6 sm:p-10 space-y-7 relative overflow-hidden">
          {/* Subtle gradient background decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Job Description Field */}
          <div className="space-y-2 relative">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-200">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Job Description *</span>
              </label>
              <span className="text-[11px] font-mono text-slate-400">Pasted directly &bull; deterministic extraction</span>
            </div>
            <textarea
              rows={6}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste job description text here (e.g. Senior Backend Engineer with 5+ years of Node.js, microservices, system architecture, mentoring junior engineers)..."
              className="glass-input w-full rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors leading-relaxed font-sans"
              required
            />
          </div>

          {/* URL & Days Split */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-200">
                <Building2 className="w-4 h-4 text-sky-400" />
                <span>Company Website URL *</span>
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                <input
                  type="text"
                  value={companyUrl}
                  onChange={(e) => setCompanyUrl(e.target.value)}
                  placeholder="https://posthog.com or gitlab.com"
                  className="glass-input w-full rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors font-mono text-xs"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400">Autonomous crawler discovers careers, engineering blogs & hiring pages.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-200">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <span>Days Before Interview</span>
                </label>
                <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md">
                  {days} Days Available
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 mt-3"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>1 Day (Cram)</span>
                <span>7 Days (Standard)</span>
                <span>30 Days (Deep Mastery)</span>
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-gradient-to-r from-sky-600 via-sky-500 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-sky-600/30 hover:shadow-sky-500/50 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Generating Interview Kit...</span>
                </>
              ) : (
                <>
                  <span>Launch Research & Generation Pipeline</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Live Step-by-Step Generation Progress HUD */}
          {loading && (
            <div className="p-5 rounded-2xl bg-[#070c18] border border-sky-500/30 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-sky-400 flex items-center gap-2">
                  <Activity className="w-4 h-4 animate-pulse text-sky-400" />
                  Deliberate Multi-Step Pipeline Active
                </span>
                <span className="font-mono text-slate-400 font-semibold">Step {currentStep + 1} of 5</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-500" 
                  style={{ width: `${((currentStep + 1) / 5) * 100}%` }}
                />
              </div>

              <div className="space-y-2 text-xs">
                {stepsList.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    {idx < currentStep ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : idx === currentStep ? (
                      <Loader2 className="w-4 h-4 text-sky-400 animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700 flex-shrink-0" />
                    )}
                    <span className={idx === currentStep ? 'text-white font-semibold' : idx < currentStep ? 'text-slate-400' : 'text-slate-600'}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      ) : (
        /* Batch Ingestion Form */
        <form onSubmit={handleBatchSubmit} className="glass-panel p-8 sm:p-12 space-y-6 text-center">
          <div className="border-2 border-dashed border-white/10 hover:border-sky-500/50 rounded-3xl p-10 transition-all bg-slate-900/40">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto mb-4 border border-sky-500/20">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Upload Batch Cases JSON</h3>
            <p className="text-xs text-slate-400 mb-6 max-w-md mx-auto leading-relaxed">
              Upload a JSON file containing an array of cases matching the Section 9 specification:
              <br />
              <code className="text-sky-300 font-mono text-[11px] block mt-1">[&#123; "id": "case-01", "jd": "...", "company_url": "...", "days": 5 &#125;]</code>
            </p>

            <input
              type="file"
              accept=".json,.txt"
              onChange={(e) => setBatchFile(e.target.files[0])}
              className="text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-500/10 file:text-sky-400 hover:file:bg-sky-500/20 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !batchFile}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{stepText}</span>
              </>
            ) : (
              <span>Process Batch Cases</span>
            )}
          </button>
        </form>
      )}

      {/* Feature Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="glass-card p-6 space-y-3 relative overflow-hidden group">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-sm border border-sky-500/20 group-hover:scale-110 transition-transform">
            <Search className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-base">Autonomous Web Research</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Crawls company domain, ranks internal career links via keyword scoring matrix, adheres to robots.txt, and searches candidate interview discussions.
          </p>
          <div className="pt-2">
            <span className="badge-pill bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono text-[10px]">
              SSRF Protected &bull; Backoff
            </span>
          </div>
        </div>

        <div className="glass-card p-6 space-y-3 relative overflow-hidden group">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/20 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-base">Deterministic 2nd Pass</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Compares generated questions against extracted must-have requirements in code. Uncovered gaps trigger a second pass to eliminate omissions.
          </p>
          <div className="pt-2">
            <span className="badge-pill bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono text-[10px]">
              Code Decision Loop &bull; Zero Gaps
            </span>
          </div>
        </div>

        <div className="glass-card p-6 space-y-3 relative overflow-hidden group">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/20 group-hover:scale-110 transition-transform">
            <Cpu className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-base">Arithmetic Study Schedule</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Code-driven arithmetic distribution across your exact requested days. Priority topics & difficulty 3 questions land early, not the night before.
          </p>
          <div className="pt-2">
            <span className="badge-pill bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px]">
              Integer Minutes &bull; 1–60 Days
            </span>
          </div>
        </div>
      </div>

      {/* Terminal Batch Tip Strip */}
      <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-slate-400">Mandatory Section 9 CLI Batch Runner Ready:</span>
          <code className="text-sky-300 font-bold bg-sky-950/60 px-2.5 py-1 rounded-md border border-sky-800/40">
            npm run evaluate -- --input cases.json --output kits.json
          </code>
        </div>
        <span className="text-[11px] text-slate-500">Appendix B Schema Compliant</span>
      </div>
    </div>
  );
}
