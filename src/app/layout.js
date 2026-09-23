import './globals.css';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'PrepKit.ai | Autonomous Interview Intelligence Studio',
  description: 'Turn any job description and company URL into an interview prep kit with deterministic coverage verification, spaced-repetition flashcards, and arithmetic scheduling.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#070a12] text-slate-100 min-h-screen flex flex-col font-sans selection:bg-sky-500 selection:text-white">
        <Navbar />

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {children}
        </main>

        {/* High-end Footer */}
        <footer className="border-t border-white/[0.08] py-8 bg-[#060910] text-xs text-slate-500 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-400 font-semibold">PrepKit.ai &bull; Trao Full-Stack Engineering Assessment (FS-AI-INTERVIEW-01)</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
              <span>Next.js 14 App Router</span>
              <span>&bull;</span>
              <span>Tailwind CSS</span>
              <span>&bull;</span>
              <span className="text-sky-400">Appendix A & B Verified</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
