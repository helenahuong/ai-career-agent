# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Aria** is an AI-powered career agent. Users chat with Aria (powered by `claude-sonnet-4-6`) to search jobs, upload resumes, schedule daily email digests, and practice interviews.

- **Backend**: Python FastAPI on port 8000
- **Frontend**: Next.js 16 (App Router) on port 3000
- **AI**: Claude via `services/claude_agent.py` — streaming agentic loop with 4 tools
- **Jobs**: JSearch (RapidAPI) aggregating LinkedIn + Indeed
- **Email**: Resend with APScheduler daily cron at 8am UTC
- **DB**: Async SQLAlchemy → Supabase PostgreSQL (or local SQLite in dev)

---

## Workflow Orchestration

### 1. Plan Before Acting
- For any task with 3+ steps or touching both backend and frontend: stop and plan first
- Write a task list before touching code — use TodoWrite to track progress
- If something breaks mid-task, STOP and re-plan. Don't keep pushing blindly
- Verify each step works before moving to the next

### 2. Subagent Strategy
- Offload codebase exploration and research to subagents to keep the main context clean
- For parallel independent work (e.g. reading backend + frontend simultaneously), launch agents concurrently
- One focused task per subagent — don't give subagents sprawling multi-purpose prompts
- Use the Explore agent for file/code discovery before editing

### 3. Self-Improvement Loop
- After any correction from the user: internalize the pattern and don't repeat it
- When in doubt about Aria's intended behavior, re-read `services/claude_agent.py` — the system prompt and tool definitions are the source of truth
- If a feature feels wrong after implementing it, ask before shipping

### 4. Verification Before Done
- Never mark a task complete without testing the change works end-to-end
- For backend changes: verify the SSE stream format is still correct (frontend depends on exact event types)
- For frontend changes: check that XML tag parsing in `lib/parseMessage.ts` still handles all block types
- Ask: "Would a staff engineer approve this?" before presenting the result

### 5. Demand Elegance
- For non-trivial changes: pause and ask "is there a simpler way?"
- If a fix feels hacky, it probably is — find the root cause
- Skip this for obvious one-liners — don't over-engineer small changes

### 6. Autonomous Bug Fixing
- When given a bug report: diagnose from logs and errors, then fix it
- Check the SSE event stream first for any backend/frontend communication bugs
- The mock fallbacks (no RapidAPI key → mock jobs, no Resend key → console log) are intentional dev aids — don't remove them

---

## Task Management

1. **Plan First** — write a checklist before writing code
2. **Verify Plan** — confirm approach before implementing non-trivial changes
3. **Track Progress** — mark items complete as you go with TodoWrite
4. **Explain Changes** — give a high-level summary of what changed and why
5. **Test End-to-End** — backend and frontend must work together; don't test in isolation

---

## Core Principles

- **Simplicity First** — make every change as minimal as possible; touch only what's necessary
- **No Laziness** — find root causes, no temporary workarounds
- **Minimal Impact** — avoid introducing regressions; the SSE protocol and XML tag format are load-bearing
- **Aria is the product** — every code change should serve the user experience of chatting with Aria

---

## Development Commands

### Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev       # port 3000
npm run lint
```

### Environment Setup
Copy example files and fill in secrets:
- `backend/.env.example` → `backend/.env`
- `frontend/.env.local.example` → `frontend/.env.local`

Required keys: `ANTHROPIC_API_KEY`, `RAPIDAPI_KEY`, `RESEND_API_KEY`, `DATABASE_URL`, `FRONTEND_URL`, `NEXT_PUBLIC_API_URL`

**Dev fallbacks**: missing `RAPIDAPI_KEY` → mock job results returned. Missing `RESEND_API_KEY` → emails logged to console instead of sent. App runs fully without either.

---

## Architecture

### Backend (`backend/`)

FastAPI app (`main.py`) with CORS for localhost:3000, lifespan-managed DB init + APScheduler.

**Routers → Services flow:**

```
POST /chat/send
  → routers/chat.py
  → services/claude_agent.py   ← agentic loop + SSE streaming
      → services/job_searcher.py   (search_jobs tool)
      → services/email_service.py  (schedule_daily_email tool)
      → models/database.py         (update_candidate_profile tool → Session.candidate_profile JSON)

POST /resume/upload/{id}
  → routers/resume.py
  → services/resume_parser.py  ← pdfplumber / python-docx + Claude structuring
  → stores resume_text on Session (first 10,000 chars)
```

**Database models** (`models/database.py`):
- `Session` — `candidate_profile` (JSON), `messages` (JSON), `resume_text`, `coaching_mode`
- `EmailSchedule` — email + search params for daily digest
- `JobSent` — deduplication log for sent job listings

### Frontend (`frontend/`)

Next.js App Router. User flow: Landing page (`/`) → `/chat?q={dream_job}`.

**Key files:**
- `lib/api.ts` — `streamChat()` opens SSE, calls `onChunk` per event, `onDone` when stream closes
- `lib/parseMessage.ts` — accumulates all SSE text chunks, extracts XML-like tags into typed `MessageBlock[]`
- `components/chat/ChatInterface.tsx` — orchestrates: creates session, streams messages, maintains state
- `components/chat/` — one component per block type (JobCard, ProfileCard, ChoiceOptions, ToolStatusChip, ProgressCard)

### SSE Event Protocol

`/chat/send` streams newline-delimited JSON. **Do not change event type names** — frontend switches on these exactly:

```
data: {"type": "text_chunk", "text": "..."}
data: {"type": "tool_use", "name": "search_jobs", "label": "Searching jobs..."}
data: {"type": "progress_card", "label": "Search complete", "complete": true, "found": 5}
data: {"type": "done"}
```

### XML Block Format

Claude's text response embeds XML tags that `parseMessage.ts` extracts into rich UI. **These tags are load-bearing** — malformed JSON inside them breaks rendering silently.

| Tag | Rendered by | Notes |
|---|---|---|
| `<tool_use>{"name":"...","label":"..."}</tool_use>` | `ToolStatusChip` | Green chip |
| `<job_cards>{"jobs":[{...}]}</job_cards>` | `JobCard` | Each job needs `fit_reason` + `watch_out` |
| `<profile_card>{...}</profile_card>` | `ProfileCard` | Shown after resume upload or profile update |
| `<choice_options>{"type":"radio","options":[...]}</choice_options>` | `ChoiceOptions` | 2–3 options |
| `<choice_options>{"type":"grid","options":[...]}</choice_options>` | `ChoiceOptions` | 4–9 options |
| `<progress_card>{"label":"...","complete":false}</progress_card>` | `ProgressCard` | In-progress |
| `<progress_card>{"label":"...","complete":true,"found":N}</progress_card>` | `ProgressCard` | Done |

---

## Aria Agent Behavior

Aria's behavior is defined entirely in `services/claude_agent.py` — the `SYSTEM_PROMPT` constant and `TOOLS` list. Modify those to change how Aria thinks and acts.

### Personality
Aria is warm, direct, and expert — like a brilliant recruiter friend. She remembers everything, celebrates wins, and is encouraging during tough moments. She keeps text short and lets cards do the heavy lifting.

### Onboarding Flow (no profile yet)
1. Greet warmly based on what the user typed on the landing page
2. Ask for resume upload (or background description)
3. Show `<profile_card>` → ask about preferred locations
4. Ask work setup via `<choice_options type="radio">`: Remote / Hybrid / Onsite
5. Ask salary expectations
6. Ask for email → call `schedule_daily_email`
7. Run first `search_jobs` → show `<job_cards>`

### Tool Trigger Rules
| Signal from user | Tool to call |
|---|---|
| Shares any preference or detail | `update_candidate_profile` (always) |
| Asks about jobs / wants to search | `search_jobs` (never fabricate listings) |
| Provides email address | `schedule_daily_email` |
| Wants to practice for an interview | `start_interview_coaching` |

### Coaching Mode
When active (`coaching_mode=True` on session), Aria asks ONE interview question, waits for the answer, gives specific behavioral feedback, then asks the next question. She never batches questions.

### Dynamic System Prompt Injections
At runtime, `stream_chat()` appends to the system prompt:
- Candidate profile JSON — if profile exists
- Resume text (first 3,000 chars) — if resume was uploaded
- Coaching mode directive — if `coaching_mode=True`

### Tools
**`update_candidate_profile`** — fields: `name`, `location`, `work_setup`, `salary_min`, `email`, `target_role`, `skills`

**`search_jobs`** — params: `query` (required), `location`, `remote` (bool), `salary_min` (int)

**`schedule_daily_email`** — params: `email` (required), `search_params` `{query, location, remote}`

**`start_interview_coaching`** — params: `job_title` (required), `job_description`
