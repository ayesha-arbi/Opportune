# Opportune — AI-Powered Opportunity Scout & Application Tracker

**Opportune** is a full-stack, AI-native web platform designed to help students and researchers discover, match, and track high-impact hackathons, research fellowships, competitions, innovation challenges, and grants tailored to their academic profile.

---

## 🌟 Key Features

### 1. ChatGPT-Style Agentic Assistant
- **Real-Time Tool Calling**: The assistant autonomously executes `search_opportunities` to query live databases, `update_tracker_status` to advance application pipelines, and `web_browse_opportunities` when external verification is needed.
- **Deep Multi-Pass Search & Synonym Expansion**: Automatically expands keywords (e.g., `AI` → `machine learning`, `LLM`, `deep learning`, `computer vision`, `agents`) and relaxes search constraints across upcoming deadline windows to eliminate dead-ends.
- **Minimalist Conversational UI**: Built with ChatGPT-style floating input pills, auto-expanding textareas, assistant avatar indicators, 2×2 suggestion card grids, and collapsible sidebar navigation.
- **Multi-Model Reliability**: Features automatic candidate model fallback with silent server-side failover to prevent downtime during rate limits or outages.

### 2. Bento Grid Profile & 5-Step Detailed Onboarding
- **Bento Grid Visualization**: Interactive modular profile grid featuring a user hero badge, education summary, interests/skills tags, tracker progress breakdown, and long-term goals.
- **Rich 5-Step Onboarding**:
  1. *Let's get to know you* (Name & Bio)
  2. *Your background* (Education level, university, field of study)
  3. *Interests & skills* (Dynamic tag inputs)
  4. *Goals & preferences* (Target category, location, remote preference, dream opportunity, biggest challenge)
  5. *One more thing* (Open-ended fun facts and proud projects)
- **Skippable & Non-Blocking**: Users can skip at any step with instant partial persistence.

### 3. Application Tracker Pipeline
- **Kanban-Style State Management**: Tracks opportunities through lifecycle states (`Saved` → `Applied` → `Submitted` → `Accepted` / `Rejected`).
- **Urgency Aging-Ink Stamps**: Highlights approaching deadlines with visual countdown stamps.
- **Personalized Notes & Audit Log**: Custom application notes and timestamp tracking per opportunity.

### 4. Automated AI Web Scraping Pipeline
- **Scheduled Python Pipeline**: Runs via GitHub Actions on a daily cron schedule to discover active hackathons and fellowships from platforms like Devpost and Major League Hacking (MLH).
- **Strict Pydantic Validation**: Uses AI-based JSON extraction with strict date validation (`deadline`, `start_date`, `end_date`) to prevent date hallucinations.
- **Safe Upserts & Stale Cleanup**: Deduplicates records on `source_url` and automatically deactivates expired opportunities.

### 5. Skeleton Loading UI
- **Zero-Flicker Shimmer Placeholders**: Fluid skeleton screens across dashboard, profile, and chat views to ensure a smooth perceived performance.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 15 (App Router, Server Components), React 19, TypeScript, Tailwind CSS, Lucide Icons |
| **Backend & APIs** | Next.js API Routes, Supabase (PostgreSQL, Row-Level Security, Auth) |
| **AI & LLM Orchestration** | Groq / OpenRouter API, Function & Tool Calling, Multi-Model Fallback |
| **Vector & Search** | PostgreSQL, pgvector (HNSW cosine similarity), Deep multi-pass keyword retrieval |
| **Scraper Pipeline** | Python 3.11, BeautifulSoup4, Requests, Playwright, Pydantic |
| **Infra & CI/CD** | Vercel (Hosting & Cron), Supabase, GitHub Actions |

---

## 🏛️ Architecture & Security

1. **Strict Server-Side Tool Execution**: The client browser never accesses Supabase service keys or LLM provider credentials. All search and tracker tool executions are performed server-side scoped to authenticated user sessions.
2. **Row-Level Security (RLS)**: Fine-grained PostgreSQL RLS policies ensure users can only access and modify their own profiles, tracker entries, and conversation histories. Opportunities are globally readable by authenticated users and writable strictly via service-role keys.
3. **Cost & Rate Control**: Per-user daily message limits prevent abuse on metered inference endpoints.

---

## 📁 Project Structure

```
Opportune/
├── app/
│   ├── api/
│   │   ├── chat/            # Agentic chat API with deep multi-pass tool calling
│   │   ├── tracker/         # Application tracker CRUD
│   │   └── notifications/   # Scheduled deadline reminder cron
│   ├── chat/                # ChatGPT-style conversation view & sidebar
│   ├── dashboard/           # Personalized recommendations & deadline dashboard
│   ├── tracker/             # Application lifecycle tracker
│   ├── profile/             # Bento grid profile view
│   ├── onboarding/          # 5-step skippable onboarding flow
│   └── login/ signup/       # Supabase auth pages
├── components/
│   ├── chat/                # ChatView, ChatSidebar
│   ├── common/              # AppShell, Skeleton primitives, DateStamp, TagInput
│   ├── dashboard/           # Dashboard widgets
│   ├── opportunities/       # OpportunityCard
│   └── tracker/             # Tracker status controls
├── lib/
│   ├── ai/                  # LLM clients, fallback orchestrators, browsing tools
│   ├── supabase/            # Client, server, and middleware session helpers
│   └── utils.ts             # Shared validators and date formatters
├── scraper/
│   ├── sources/             # Source crawlers (Devpost, MLH, etc.)
│   ├── db.py                # Supabase service-role client & upsert engine
│   ├── llm.py               # AI JSON extractor with anti-hallucination guardrails
│   ├── schema.py            # Pydantic opportunity validation models
│   ├── main.py              # CLI entrypoint with summary reporting
│   └── requirements.txt     # Python scraper dependencies
├── supabase/
│   └── migrations/          # 001–006 SQL schema, RLS, indexes & vector RPCs
└── .github/workflows/       # scraper.yml scheduled GitHub Actions workflow
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+
- Python 3.11+
- Supabase Project & Credentials
- Groq / OpenRouter API Key

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/ayesha-arbi/Opportune.git
cd Opportune

# Install Node dependencies
npm install

# Install Python scraper dependencies
pip install -r scraper/requirements.txt
```

### 3. Environment Configuration

Create a `.env` or `.env.local` file in the root directory:

```env
# Public Supabase (Browser-safe)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Server-Only Credentials
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional settings
CHAT_DAILY_LIMIT=30
RESEND_API_KEY=your_resend_api_key
CRON_SECRET=your_cron_secret
```

### 4. Database Setup

Apply migrations in order from `supabase/migrations/`:
1. `001_init.sql` — Base tables, RLS policies, triggers
2. `002_chat_conversations.sql` — Per-thread conversation scoping
3. `003_profile_open_ended.sql` — Rich profile text columns
4. `004_opportunities_source_url_unique.sql` — Deduplication constraints

```bash
# Push migrations using Supabase CLI
npx supabase db push
```

### 5. Running the Application

```bash
# Start local Next.js development server
npm run dev

# Run TypeScript verification
npm run typecheck

# Run the Python scraper locally
python -m scraper.main
```

---

## 📄 License

Distributed under the AGPL-3.0 License. See [LICENSE](LICENSE) for more information.
