# Aria — AI Career Agent

A portfolio-quality AI career agent. Chat with Aria to search jobs, build your profile from your resume, get daily email digests, and practice interviews.

## Features

- **Resume upload** — PDF/DOCX parsed by Claude into a structured candidate profile
- **AI job search** — Searches LinkedIn + Indeed (via JSearch/RapidAPI) with "Why this is a fit" explanations
- **Daily email digest** — Automated daily job emails via Resend
- **Interview coaching** — Toggle coaching mode for AI-powered mock interviews
- **Chat-first UX** — Tool use shown as green status chips, jobs and profiles as rich inline cards

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Backend | Python FastAPI, SQLAlchemy |
| Database | Supabase (PostgreSQL via asyncpg) |
| AI | Claude claude-sonnet-4-6 (Anthropic) |
| Jobs | JSearch API on RapidAPI (LinkedIn + Indeed aggregator) |
| Email | Resend |
| Scheduler | APScheduler |

## Setup

### 1. Get API Keys

| Service | Where to get | Free tier |
|---------|-------------|-----------|
| **Anthropic** | console.anthropic.com | Pay per token |
| **RapidAPI / JSearch** | rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch | 200 req/month |
| **Resend** | resend.com | 3,000 emails/month |
| **Supabase** | supabase.com | 500MB DB, 2 projects |

### 2. Database — Supabase

1. Create a new project at supabase.com
2. Go to **Project > Settings > Database > Connection string**
3. Select **Session pooler**, port **5432**, copy the URI
4. It looks like: `postgresql+asyncpg://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`
5. Tables are created automatically on first backend run (SQLAlchemy creates them)

### 3. Backend

```bash
cd backend
cp .env.example .env
# Fill in your keys in .env
```

`.env` should contain:
```
ANTHROPIC_API_KEY=...
RAPIDAPI_KEY=...
RESEND_API_KEY=...
DATABASE_URL=postgresql+asyncpg://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
FRONTEND_URL=http://localhost:3000
```

```bash
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 4. Frontend

```bash
cd frontend
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL is already set to http://localhost:8000

npm install
npm run dev
```

Open: http://localhost:3000

## How it works

1. **Landing page** — Describe your dream job, click "Talk to Aria"
2. **Onboarding** — Aria greets you and asks to upload your resume
3. **Profile building** — Claude parses your resume → shows a profile card in chat
4. **Preferences** — Aria asks structured questions (location, setup, salary) via inline choice buttons
5. **Job search** — Aria calls JSearch (RapidAPI), shows job cards with AI fit analysis
6. **Email setup** — Provide email → daily digest scheduled at 8am UTC
7. **Interview coaching** — Toggle the Coaching button, Aria switches to mock interview mode

## Project Structure

```
ai-career-agent/
├── backend/
│   ├── main.py                    # FastAPI app entry
│   ├── models/database.py         # SQLAlchemy models (Session, EmailSchedule, JobSent)
│   ├── routers/
│   │   ├── chat.py                # SSE streaming chat endpoint
│   │   ├── resume.py              # Resume upload endpoint
│   │   └── jobs.py                # Job search endpoint
│   └── services/
│       ├── claude_agent.py        # Claude + tools + SSE streaming
│       ├── resume_parser.py       # PDF/DOCX → structured profile
│       ├── job_searcher.py        # JSearch / RapidAPI client
│       ├── email_service.py       # Resend email templates
│       └── scheduler.py          # APScheduler daily cron
└── frontend/
    ├── app/
    │   ├── page.tsx               # Landing page
    │   └── chat/page.tsx          # Chat interface
    ├── components/chat/
    │   ├── ChatInterface.tsx      # Main chat container
    │   ├── MessageBubble.tsx      # Message renderer
    │   ├── JobCard.tsx            # Rich job card
    │   ├── ProfileCard.tsx        # Candidate profile card
    │   ├── ToolStatusChip.tsx     # Green agent action chips
    │   ├── ChoiceOptions.tsx      # Inline radio/grid choices
    │   ├── ProgressCard.tsx       # Search progress bar
    │   └── ChatInput.tsx          # Input bar with resume upload
    └── lib/
        ├── api.ts                 # Backend fetch helpers + SSE
        ├── types.ts               # TypeScript types
        └── parseMessage.ts        # SSE text → rich blocks parser
```

## Development Notes

- Without `RAPIDAPI_KEY`, job search falls back to mock data (full UX still demos)
- Without `RESEND_API_KEY`, emails are logged to console instead of sent
- Supabase tables (`sessions`, `email_schedules`, `jobs_sent`) are auto-created on first run
- Daily email digest runs at 8am UTC via APScheduler
