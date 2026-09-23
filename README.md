# Trao Full-Stack AI Engineering Assessment: The AI Interview Prep Kit

> **A full-stack web application that turns any Job Description and Company Website URL into a structured, highly personalized interview preparation kit.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-interview--prep--kit--delta.vercel.app-brightgreen?style=for-the-badge&logo=vercel)](https://interview-prep-kit-delta.vercel.app/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-AI--Interview--Prep--Kit-blue?style=for-the-badge&logo=github)](https://github.com/gautamjatin2205/AI-Interview-Prep-Kit)

| | Link |
|---|---|
| 🌐 **Live App** | [https://interview-prep-kit-delta.vercel.app/](https://interview-prep-kit-delta.vercel.app/) |
| 📦 **GitHub Repository** | [https://github.com/gautamjatin2205/AI-Interview-Prep-Kit](https://github.com/gautamjatin2205/AI-Interview-Prep-Kit) |
| 🗄️ **Database** | MongoDB Atlas (Cluster0) |

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
- **LLM & AI Engine**: **Google Gemini 2.5 Flash** (via Google Generative Language REST API) with multi-provider waterfall (Groq Llama 3 / OpenAI GPT-4o-mini / Built-in Heuristic NLP Engine fallback ensuring zero downtime and rate-limit immunity).

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
- `flashcards`: `[{ id, front, back, requirement_ids }]`
- `schedule`: `{ days_available, days: [{ day, focus, question_ids, minutes }] }`
- `coverage`: `{ uncovered_requirement_ids, passes }`

---

## 🤖 LLM & AI Engine Integration (Google Gemini 2.5 Flash)

The platform is powered by **Google Gemini 2.5 Flash** (`gemini-2.5-flash`), with automated graceful waterfalls to Groq (`llama3-70b-8192`), OpenAI (`gpt-4o-mini`), and an intelligent heuristic engine.

```
                  ┌────────────────────────────────────────┐
                  │          USER / FRONTEND UI            │
                  └──────────────────┬─────────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
   /api/ai/evaluate             /api/ai/chat              /api/ai/hint
  (Answer Evaluator)        (Contextual Coach)         (Strategy Roadmap)
           │                         │                         │
           └─────────────────────────┼─────────────────────────┘
                                     │
                                     ▼
                      src/services/llm/index.js
                                     │
             ┌───────────────────────┼───────────────────────┐
             ▼ (Primary)             ▼ (Secondary)           ▼ (Tertiary)
       Google Gemini            Groq Cloud              OpenAI
     (gemini-2.5-flash)      (llama3-70b-8192)       (gpt-4o-mini)
             │                       │                       │
             └───────────────────────┴───────────────────────┘
                                     │ (All Keys Missing / Exhausted)
                                     ▼
                        Deterministic Heuristic Engine
                           (Guaranteed 0-Downtime)
```

### 1. 🎯 Interactive AI Answer Evaluator (Practice Mode)
- **Endpoint**: `POST /api/ai/evaluate`
- Located directly inside the interactive flashcard practice runner (`/practice/[id]`).
- Candidates type their answer and receive an instant multi-dimensional evaluation:
  - **Score (1–10)** and Performance Grade (`Excellent`, `Good`, `Fair`, `Needs Work`).
  - **Key Strengths**: Bulleted list of concepts the candidate explained well.
  - **Areas to Polish**: Missed edge cases, scalability points, or STAR structure gaps.
  - **Exemplar Model Answer**: Ideal response demonstrating high-conviction delivery.
  - **Actionable Delivery Tip**: Behavioral advice for real-time interview performance.

### 2. 💬 Floating AI Interview Coach (Kit Studio)
- **Endpoint**: `POST /api/ai/chat`
- A persistent, glassmorphic widget (`Ask AI Coach`) accessible on any prep kit view.
- **Deep Context Grounding**: Automatically injects target company research, role seniority, extracted requirements, and question bank into Gemini's system instructions.
- Provides quick prompt suggestions (e.g., *"How should I introduce myself?"*, *"Summarize company values"*, *"Top 3 interview tips"*) and full conversational thread memory.

### 3. 💡 AI Question Hints System
- **Endpoint**: `POST /api/ai/hint`
- Every question card features a dedicated **"AI Hint"** button.
- Generates strategic interview guidance:
  1. What the interviewer is secretly testing for
  2. Optimal mental model/framework (e.g. STAR method, system design trade-offs)
  3. Fatal pitfalls to avoid

### 4. ⚡ End-to-End Pipeline AI Generation
- **Company Brief**: Synthesizes unstructured crawled text and hiring discussions into a concise executive brief.
- **Category-Tailored Generation**: Separate LLM calls for technical, behavioral, and system design categories.
- **Requirement-Mapped Flashcards**: AI-generated flashcards directly derived from extracted job description requirements.

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

---

## 🚀 Deployment Guide (Vercel)

The application is deployed on **Vercel** as a monorepo (Next.js handles both frontend and backend via API routes — no separate backend deployment needed).

### Live URL
🌐 **[https://interview-prep-kit-delta.vercel.app/](https://interview-prep-kit-delta.vercel.app/)**

### Deploy Your Own Instance

1. **Fork** this repository on GitHub.
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your fork.
3. In the **Environment Variables** section, add:

| Variable | Value | Required | Description |
|---|---|---|---|
| `MONGODB_URI` | Your MongoDB Atlas connection string | ✅ Yes | Database for user accounts and kits |
| `JWT_SECRET` | A strong random secret string | ✅ Yes | Signs session tokens |
| `GEMINI_API_KEY` | Google AI Studio Gemini API Key | ✅ Recommended | Powers Gemini 2.5 Flash LLM features |
| `LLM_PROVIDER` | `gemini` (or `groq`, `openai`, `auto`) | Optional | Selects default LLM provider |
| `GROQ_API_KEY` | Your Groq API key | Optional | Backup Llama 3 70B provider |
| `OPENAI_API_KEY` | Your OpenAI API key | Optional | Backup GPT-4o-mini provider |

4. Click **Deploy**. Vercel auto-detects Next.js and builds it.

> **Note**: If `MONGODB_URI` is not set, the app falls back to a local JSON store, but on Vercel (serverless) persistent state requires MongoDB. Always provide a valid Atlas URI for production.
