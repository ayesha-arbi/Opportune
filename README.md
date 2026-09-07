# Opportune

An AI-powered personalized opportunity finder. Tell it what you study and what you're aiming for, then ask in plain language for hackathons, research programs, fellowships, competitions, and grants — the AI searches a live, self-updating database (never its own memory), explains why each pick fits you, and tracks your applications through to acceptance letters.

## What it does

- **AI chat** — ChatGPT-style interface with tool-calling: the assistant runs `search_opportunities` against the database, `update_tracker_status` to save or advance applications, and can browse allowlisted opportunity sites when the database comes up empty. Per-conversation history, markdown replies, copy button, and a live tool-activity trail.
- **Semantic matching (pgvector)** — opportunities and user profiles are embedded and ranked by cosine similarity via a `match_opportunities` RPC, with keyword/tag search as fallback. Powers both chat search quality and dashboard recommendations.
- **Tracker** — saved → applied → submitted → accepted/rejected, with notes, applied date, status filters, and a dense ticket-stub UI.
- **Dashboard** — upcoming deadlines (with an aging-ink urgency stamp), semantic recommendations that exclude already-tracked items, and recently added opportunities.
- **Notifications** — a daily cron (`/api/notifications`, Vercel Cron) emails per-user deadline reminders and a weekly "new matches" digest, honoring per-user preferences stored on the profile.
- **Scraper** — a Python pipeline (Devpost, MLH, and config-driven WordPress/RSS aggregators, plus an optional AI-directed agentic crawler) that extracts into a strict Pydantic schema and upserts to Supabase. Runs daily via GitHub Actions.
- **Auth & onboarding** — email/password auth with auto-created profiles, a three-step onboarding flow, RLS-protected profile editing, and direct-from-browser writes for everything except the chat flow.

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, lucide-react, react-markdown |
| Backend | Next.js API routes, Supabase (Postgres + RLS + Auth), Groq API (OpenAI-compatible), OpenAI-compatible embeddings, Resend |
| Data | PostgreSQL + pgvector (HNSW, cosine), hand-written `Database` types |
| Pipeline | Python 3.11, requests, BeautifulSoup, feedparser, Pydantic, Playwright (optional agentic mode) |
| Infra | Vercel (app + cron), Supabase, GitHub Actions (scraper) |

## Architecture: two deliberate data-access patterns

1. **Chat flow → only `/api/chat`.** The browser never talks to Supabase for chat; tool execution happens server-side with the user's RLS-scoped client. User identity always comes from the session/bearer token — never a client-supplied ID.
2. **Everything else → direct Supabase under RLS.** Onboarding/profile writes go through the browser client (the RLS policy *is* the authorization layer); dashboard and profile reads run in server components; tracker reads use the existing `/api/tracker` join.

Per-user daily chat cap (`CHAT_DAILY_LIMIT`) protects the only metered-cost endpoint.

## Project structure

```
Opportune/
├── app/
│   ├── api/
│   │   ├── chat/            # Chat + tool-calling (Groq, rate-limited)
│   │   ├── tracker/         # Tracker CRUD (joined reads, upserts, deletes)
│   │   └── notifications/   # Deadline reminders + weekly digest (cron)
│   ├── chat/                # Chat page (server history + client view)
│   ├── dashboard/           # Dashboard (server component)
│   ├── tracker/             # Tracker page
│   ├── profile/             # Profile (bento grid + notification settings)
│   ├── onboarding/          # 3-step onboarding
│   └── login/ signup/       # Auth pages
├── components/              # chat/, tracker/, opportunities/, profile/, common/
├── lib/
│   ├── ai/                  # groq.ts, embeddings.ts, browsing-tools.ts
│   ├── supabase/            # server.ts, client.ts, middleware.ts
│   └── utils.ts             # Shared validators
├── scripts/                 # backfill-embeddings.ts (Phase 8 backfill)
├── scraper/                 # Python pipeline (see below)
├── supabase/
│   ├── migrations/          # 001–006 (schema → chat threads → profile fields
│   │                        # → source_url unique → pgvector → notif prefs)
│   └── seed_opportunities.sql
├── types/database.ts        # Hand-written Database types
├── middleware.ts            # Session refresh + auth gates
└── vercel.json              # Cron: notifications daily 09:00 UTC
```

## Getting started

**Prerequisites:** Node 20+, Python 3.11+, a Supabase project, a Groq API key, and (for semantic matching) an OpenAI-compatible embeddings key.

```bash
git clone https://github.com/ayesha-arbi/Opportune.git
cd Opportune
npm install
pip install -r scraper/requirements.txt
cp .env.example .env   # then fill in the values below
```

### Environment variables

```bash
# Public (browser-safe)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Server-only — never exposed to the browser
SUPABASE_SERVICE_ROLE_KEY=     # notifications cron + scraper + backfill
GROQ_API_KEY=                  # chat + scraper extraction
GROQ_MODEL=openai/gpt-oss-20b
GROQ_MAX_TOKENS=2048
EMBEDDING_API_KEY=             # semantic matching (text-embedding-3-small default)
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_BASE_URL=            # optional: non-OpenAI OpenAI-compatible endpoint
CHAT_DAILY_LIMIT=30            # per-user daily chat cap
RESEND_API_KEY=
EMAIL_FROM=Opportune <onboarding@resend.dev>
CRON_SECRET=                   # Vercel Cron sends this as a Bearer token
```

### Database setup

Run each migration in `supabase/migrations/` **in numeric order** in the Supabase SQL editor (or `supabase db push`):

`001` schema + RLS · `002` chat threads · `003` profile open-ended fields · `004` source_url unique · `005` pgvector + match RPC · `006` notification preferences.

Then, optionally, seed sample opportunities:

```bash
# paste supabase/seed_opportunities.sql into the SQL editor, or:
psql "$SUPABASE_DB_URL" -f supabase/seed_opportunities.sql
```

Seed deadlines are illustrative — the scraper replaces them with real data.

### Embeddings backfill (semantic matching)

After migrations + seed, with `EMBEDDING_API_KEY` set:

```bash
npx tsx scripts/backfill-embeddings.ts
```

Only rows with a null embedding are processed, so it's safely re-runnable after scraper runs. Profile embeddings are computed lazily (and refreshed on profile changes) by the dashboard itself.

### Run

```bash
npm run dev        # http://localhost:3000
npm run build      # production build check
npm run typecheck
```

## The scraper

```bash
# Always run as a module from the repo root — never `python scraper/main.py`
python -m scraper.main
```

- **Sources** are config-driven: add a `SourceConfig` to `scraper/config.py` (`wp_rest_api` or `rss_feed` discovery), then add the domain to the allowlists in `lib/ai/browsing-tools.ts` and `scraper/agentic_crawler.py`.
- **Agentic crawler** (optional, `RUN_AGENTIC_CRAWLER=true`): the LLM decides which links to follow within a fetch budget, respecting robots.txt and a domain allowlist.
- **Extraction** is strict: the schema rejects hallucinated deadlines, past deadlines, and non-opportunity pages.
- **Scheduled runs** use GitHub Actions (`.github/workflows/scraper.yml`, daily 02:00 UTC). Add repo secrets: `GROQ_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Notifications

`vercel.json` schedules `GET /api/notifications` daily at 09:00 UTC (adjust for your timezone). The endpoint:

- verifies `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends it automatically when `CRON_SECRET` is set),
- emails each user their tracked opportunities closing within *their own* reminder window (`reminder_days_before`, default 3),
- sends a weekly "new matches" digest for users with `digest_frequency = 'weekly'`,
- marks rows sent (`reminder_sent`) so nothing double-sends, and returns a JSON summary with per-failure detail.

Set `CRON_SECRET` in Vercel project env vars and run the cron against production. `onboarding@resend.dev` only delivers to your own account — verify a domain in Resend before real users.

## Security

- RLS on every table; users can only read/write their own rows; opportunities are readable by authenticated users and writable only via the service role.
- Service-role, Groq, embeddings, and Resend keys are server-only. Client components never receive them.
- Client-supplied user IDs are always ignored — identity comes from the Supabase session or bearer token.
- Chat is rate-limited per user per day; the cron endpoint fails closed without `CRON_SECRET`.
- The agentic crawler enforces a domain allowlist and fetch budgets.

## Roadmap

- Voice input and keyboard shortcuts in chat
- Calendar export (deadlines → Google Calendar)
- Application documents attached to tracker entries
- Source reliability dashboard for the scraper
- More sources and richer filters (funding amount, region, duration)
- OAuth providers and data export

## License

AGPL-3.0 — see [LICENSE](LICENSE).
