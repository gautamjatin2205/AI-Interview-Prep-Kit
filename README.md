# Trao Full-Stack AI Engineering Assessment: The AI Interview Prep Kit

> **A full-stack web application that turns any Job Description and Company Website URL into a structured, highly personalized interview preparation kit.**

---

## 🌟 Overview & Highlights

This repository contains the complete full-stack implementation of **The AI Interview Prep Kit** built for the **Trao Full-Stack Engineering Assessment (FS-AI-INTERVIEW-01)**.

### Key Capabilities:
1. **Autonomous Web Research**: Crawls company domain, ranks and discovers internal pages (`/careers`, `/jobs`, `/about`, `/engineering`), and extracts company focus and hiring context.
2. **Deterministic Requirement Extraction & 2nd Pass Coverage**: Extracts must-have and nice-to-have requirements, generates categorized questions, and executes a **Second Pass** if any must-have requirement lacks coverage.
3. **Arithmetic Study Schedule**: Code-driven, deterministic schedule allocation (not handed to LLM prompts!). Distributes questions across exact requested days, placing harder (difficulty 3) and must-have topics on earlier days.
4. **Reshapeable Kit Builder**: Interactive UI allowing inline editing, category reordering, question adding/deleting, pinning, and **Single Section Regeneration** (regenerating company brief, one question category, or schedule WITHOUT clobbering user manual edits or pinned states!).
5. **Interactive Practice Mode**: Flashcard runner with answer reveal, 1-to-5 star confidence rating, and automatic spaced-repetition deck sorting (cards with lowest confidence appear first).
6. **Mandatory CLI Batch Entry Point**: Full support for `npm run evaluate -- --input cases.json --output kits.json` matching exact Appendix B schema.
7. **MongoDB & Zero-Crash Fallback**: Connects to MongoDB Atlas via `MONGODB_URI` in `.env`. If no URI is provided, it seamlessly falls back to a file-backed local JSON store so the app runs 100% out of the box!

---

## 🛠️ Chosen Tech Stack & Justification

- **Frontend**: Next.js 14 (App Router) + React 18 + Tailwind CSS (Responsive glassmorphic UI, responsive layouts, keyboard accessible).
- **Backend API**: Node.js + Next.js API Routes / Express.
- **Database**: MongoDB (Mongoose ORM) configured via `MONGODB_URI` in `.env`, with a file-backed JSON store fallback (`src/lib/db.js`).
- **Web Crawler**: Cheerio + Axios + SSRF URL Security Validation.
- **LLM Engine**: Multi-provider support (Groq / OpenAI / Gemini / Built-in Heuristic NLP Engine fallback ensuring rate-limit immunity).

---

## 🚀 Quick Setup & Usage

### 1. Installation
Clone the repository and install dependencies:
```bash
cd ai-interview-prep-kit
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` (Optional):
```env
MONGODB_URI=your_mongodb_cluster_connection_string
JWT_SECRET=super-secret-key-2026
LLM_PROVIDER=auto
OPENAI_API_KEY=
GROQ_API_KEY=
```
*(Note: If `MONGODB_URI` is left blank, the system automatically uses its local file database fallback in `./data/db.json` so you can test immediately!)*

### 3. Run Web Application
Start dev server:
```bash
npm run dev
```
Open your browser at: **`http://localhost:3000`**

### 4. Mandatory CLI Batch Entry Point (Section 9)
Run the pipeline against batch cases JSON file:
```bash
npm run evaluate -- --input cases.json --output kits.json
```
- Input format: array of `{ id, jd, company_url, days }`.
- Output format: exact **Appendix B** JSON structure (`{ version, generated_at, kits: [...] }`).

### 5. Run Automated Pipeline Test Suite
```bash
npm test
```
*(Executes 3 automated unit & integration tests verifying scheduler, second-pass coverage, and Appendix A schema compliance).*

---

## 📐 Architecture & Pipeline Sequence

```
1. Client Input (JD + Company URL + Days)
       │
       ▼
2. Web Crawler (Cheerio + Axios) ──► Crawls domain, ranks /careers, /jobs, /about links
       │
       ▼
3. Requirement Extractor ──────────► Extracts 'r1', 'r2'... marked 'must' | 'nice'
       │
       ▼
4. Categorized Q Generator ────────► Technical, Behavioural, System Design, Company Fit
       │
       ▼
5. 2nd Pass Coverage Check ────────► Finds gap must-have requirements & generates missing Qs
       │
       ▼
6. Arithmetic Scheduler ───────────► Code-driven allocation across requested days
       │
       ▼
7. Reshapeable Kit Builder ────────► Inline edits, category moves, single section regeneration
       │
       ▼
8. Practice Flashcard Deck ────────► Interactive confidence ratings & spaced repetition
```

---

## 📋 Exact Schema Compliance (Appendix A & B)
Every generated kit matches the mandatory **Appendix A** structure:
- `source`: `{ company, company_url, role, location, jd_chars, researched_at, pages_used }`
- `company_brief`: `{ summary, what_they_do, sources }`
- `role`: `{ title, seniority, responsibilities, requirements: [{ id, text, kind, priority }] }`
- `questions`: `[{ id, requirement_ids, category, prompt, answer_outline, difficulty }]`
- `flashcards`: `[{ id, front, back, requirement_ids }]`
- `schedule`: `{ days_available, days: [{ day, focus, question_ids, minutes }] }`
- `coverage`: `{ uncovered_requirement_ids, passes }`

---

## 🔒 Security & Edge Case Handling (Section 10 & 11)

1. **SSRF & URL Protection**: The crawler checks target hostnames and rejects private/loopback IP addresses (`127.0.0.1`, `10.x`, `192.168.x`) in production.
2. **Prompt Injection Defense**: Fetched web page content is treated strictly as data to summarize inside delimited prompt blocks.
3. **Thin JDs & Unreachable Sites**: If a company site is unreachable or a JD is a 2-line stub, the system does not crash or fabricate facts—it generates an honest brief recording the limitation.
4. **Preserving User Manual Edits**: When a single section is regenerated, items with `isUserEdited: true` or `isPinned: true` survive the regeneration untouched.

---

## 🔍 Retrieval & Research Sources (Section 2 Compliance)

The system does not rely on a fixed list of paths. The autonomous crawler performs:
1. **Robots.txt Adherence**: Checks `{origin}/robots.txt` before fetching and strictly obeys `Disallow:` rules for automated crawlers.
2. **Dynamic Link Discovery & Scoring**: Scans the homepage for all same-origin anchors, ranks candidate links dynamically with a keyword scoring matrix (`career`, `careers`, `jobs`, `about`, `hiring`, `interview`, `engineering`, `culture`, `handbook`), and navigates to the highest-scoring candidate page (e.g. PostHog handbook, GitLab jobs).
3. **Public Interview Discussions**: Scans public interview forums and discussion channels (e.g. DuckDuckGo public discussion snippets, Glassdoor/Reddit interview queries) for first-hand candidate experiences.
4. **Rate-Limiting & Exponential Backoff**: Uses `fetchWithBackoff()` which detects HTTP 429 and transient server errors, backing off exponentially (500ms, 1000ms, 2000ms) up to 3 retries.
5. **Graceful Degradation**: If an individual page or public discussion is blocked or 404s, it is reported in `pages_used` and the pipeline continues without crashing.

---

## 🔐 Authentication & Session Handling (Section 1 Compliance)

- **Registration & Login**: Dedicated pages at `/register` and `/login` with secure password hashing via `bcryptjs` and session tokens signed with JWT.
- **Session Protection**: Valid session cookies (`token`) are set with `httpOnly` flags to prevent XSS theft.
- **Access Control & Route Protection**: `middleware.js` blocks signed-out visitors from accessing `/dashboard` and redirects them to `/login`.
- **User Kit Isolation**: All database queries (`/api/kits`) enforce `{ userId: user.userId }`, ensuring users can read and modify only their own kits.

