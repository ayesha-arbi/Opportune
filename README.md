# Opportune

An AI-powered personalized opportunity finder that discovers hackathons, research programs, fellowships, competitions, and other opportunities based on your interests, education, skills, and goals. Track applications, get personalized recommendations through an AI chat interface, and receive deadline reminders so you never miss an opportunity.

## 🎯 Project Context

Opportune is evolving into a reliable opportunity-discovery platform that:

- Uses **Groq** instead of OpenRouter for AI inference
- Scrapes and extracts real opportunities into a shared database
- Supports configurable aggregator sources via a config-driven system
- Uses AI not only for extraction, but also for deciding what pages and links to crawl (agentic scraping)
- Provides both scheduled/background discovery and live, budget-capped in-chat discovery
- Preserves strict extraction validation and prevents hallucinated deadlines, links, or other fields

## ✨ Features

### ✅ Completed Features

#### Core Functionality
- **AI-Powered Chat**: Natural language interface to find opportunities based on your profile
- **Opportunity Tracker**: Save opportunities and track application status (Saved → Applied → Submitted → Accepted/Rejected)
- **Personalized Recommendations**: AI matches opportunities to your interests, skills, and goals
- **Deadline Tracking**: Visual countdown to upcoming deadlines with urgency indicators
- **Profile Management**: Comprehensive onboarding with education, interests, skills, and goals

#### Scraping & Data Pipeline
- **Config-Driven Aggregators**: Easily add new opportunity sources via configuration
- **WordPress REST API Integration**: Primary discovery method for structured metadata
- **RSS Feed Support**: Fallback for sources without REST APIs
- **Multiple Source Support**: Devpost, MLH, Opportunities Corners, Opportunities Circle, Scholarships Positions, Youth Opportunities, Fully Funded Scholarships
- **Deadline Validation**: Automatically rejects opportunities with past deadlines
- **Deduplication System**: Smart matching to prevent duplicate opportunities from different sources
- **Source Reliability Scoring**: Tracks which sources provide the best data

#### Agentic Scraping
- **AI-Directed Crawling**: Agent decides which links to follow based on content analysis
- **Shared Browsing Tools**: Reusable tools for both background and live chat contexts
- **Domain Allowlist Enforcement**: Code-level security to prevent unauthorized crawling
- **Fetch Budget Management**: Configurable limits (40-60 for background, 5-8 for chat)
- **robots.txt Respect**: Checks and respects robots.txt for each domain
- **Comprehensive Logging**: Records crawl path, decisions, and extraction results

#### User Experience
- **Enhanced Onboarding**: Progress bars, completion percentage, value explanations per step
- **Loading States**: Dynamic loading messages during AI responses
- **Mobile Responsive**: Optimized layouts for all screen sizes
- **Delete Conversations**: Remove old chat conversations with one click
- **Real-time Status Updates**: Tracker status syncs immediately when changed

#### Email Notifications
- **Deadline Reminders**: Automated emails for upcoming deadlines
- **New Opportunity Alerts**: Notifications about opportunities matching user interests
- **Beautiful HTML Templates**: Professional email formatting

#### Infrastructure
- **Groq Integration**: Fast, cost-effective AI inference using Groq API
- **Supabase Backend**: Database, authentication, and real-time features
- **GitHub Actions**: Automated scraping on schedule
- **Type Safety**: Full TypeScript on frontend, Pydantic validation on backend

### 🚧 Medium Priority Features (Not Yet Implemented)

#### User Experience
- **Voice Input**: Speech-to-text for easier chat interaction
- **Quick Actions**: One-click save/apply from chat responses
- **Better Loading States**: Skeleton screens and progressive loading
- **Keyboard Shortcuts**: Power user navigation

#### Scraping & Data
- **Deduplication Improvements**: Enhanced matching algorithms
- **Source Reliability Scoring UI**: Dashboard to view source performance
- **More Opportunity Sources**: Additional aggregators and specialized platforms
- **Real-time Validation**: Immediate feedback on scraped data quality

#### Chat & AI
- **Personalized Recommendations**: Better use of profile data for tailored suggestions
- **Conversation Context**: Better handling of multi-turn conversations
- **Tool Call Visualization**: Show user what tools the AI is using
- **Conversation Branching**: Save and explore different conversation paths

#### Tracker Features
- **Calendar Integration**: Export deadlines to Google Calendar, etc.
- **Application Progress**: Track stages (researching, applying, interviewing, etc.)
- **Document Storage**: Attach essays, resumes to tracker entries
- **Analytics Dashboard**: Success rates, time trends, preferred opportunity types

### 🎨 Nice to Have / Low Priority Features

#### Content & Discovery
- **Advanced Search**: More filters (funding amount, duration, region, etc.)
- **Saved Searches**: Save filter combinations for quick access
- **Opportunity Collections**: Curate lists of related opportunities
- **Trending Opportunities**: Show what's popular in the community

#### Social Features
- **Share Opportunities**: Send opportunities to friends
- **Success Stories**: Showcase user achievements
- **Community Discussion**: Forums around specific opportunities
- **Peer Recommendations**: "X also applied to Y"

#### Technical
- **Performance Monitoring**: Track API response times, error rates
- **Rate Limiting**: Protect against abuse
- **Caching Layer**: Cache frequent queries and API responses
- **A/B Testing**: Test different UI/UX approaches

#### Security & Privacy
- **Data Export**: Let users download their data
- **Privacy Controls**: More granular sharing settings
- **Enhanced Auth**: OAuth providers (Google, GitHub, etc.)
- **Audit Logs**: Track account activity

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Supabase Client** - Authentication and database

### Backend
- **Python 3** - Scraping and data processing
- **Groq API** - AI inference (OpenAI-compatible)
- **Supabase** - Database (PostgreSQL), authentication, real-time
- **Resend** - Email notifications
- **Requests** - HTTP client
- **BeautifulSoup** - HTML parsing
- **Feedparser** - RSS feed parsing
- **Pydantic** - Data validation

### Infrastructure
- **GitHub Actions** - CI/CD and scheduled scraping
- **Supabase** - Managed database and auth
- **Groq Cloud** - AI inference

## 📁 Project Structure

```
Opportune/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── chat/                 # Chat API with Groq integration
│   │   ├── tracker/              # Opportunity tracker API
│   │   └── chat/conversations/   # Conversation management
│   ├── chat/                     # Chat page
│   ├── dashboard/                # Dashboard page
│   ├── profile/                  # Profile page
│   └── onboarding/               # Onboarding flow
├── components/                    # React components
│   ├── chat/                     # Chat UI components
│   ├── opportunities/            # Opportunity cards
│   └── common/                   # Shared components
├── lib/                          # Shared libraries
│   ├── ai/                       # AI integration
│   │   ├── groq.ts              # Groq API client
│   │   └── browsing-tools.ts    # Agentic browsing tools
│   ├── supabase/                 # Supabase client
│   └── utils.ts                  # Utility functions
├── scraper/                      # Python scraper
│   ├── main.py                   # Main scraper entry point
│   ├── config.py                 # Source configurations
│   ├── schema.py                 # Data models and validation
│   ├── llm.py                    # Groq integration for extraction
│   ├── db.py                     # Database operations
│   ├── deduplication.py          # Deduplication utilities
│   ├── notifications.py          # Email notification system
│   ├── reliability.py            # Source reliability scoring
│   ├── agentic_crawler.py        # AI-directed crawler
│   └── sources/                  # Source-specific scrapers
│       ├── devpost.py           # Devpost scraper
│       ├── mlh.py               # MLH scraper
│       └── wordpress.py         # Generic WordPress scraper
├── supabase/                     # Supabase configuration
│   ├── migrations/               # Database migrations
│   └── config.toml              # Supabase config
├── types/                        # TypeScript types
│   └── database.ts               # Database type definitions
└── .env.example                  # Environment variables template
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.8+
- Supabase account
- Groq API key
- Resend API key (for email notifications)

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd Opportune
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Install Python dependencies**
```bash
pip install -r scraper/requirements.txt
```

4. **Configure environment variables**
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `GROQ_API_KEY` - Groq API key
- `GROQ_MODEL` - Groq model ID (default: `openai/gpt-oss-20b`)
- `GROQ_MAX_TOKENS` - Max tokens for Groq requests
- `NEXT_PUBLIC_APP_URL` - Your application URL
- `RESEND_API_KEY` - Resend API key (for email notifications)
- `EMAIL_FROM` - From email address for notifications
- `CRON_SECRET` - Secret for GitHub Actions cron
- `RUN_AGENTIC_CRAWLER` - Set to `true` to enable agentic crawler

5. **Set up Supabase**
- Create a new Supabase project
- Run the migrations in `supabase/migrations/` in the Supabase SQL editor
- Configure Row Level Security policies (included in migrations)

6. **Run the development server**
```bash
npm run dev
```

7. **Run the scraper (optional)**
```bash
python scraper/main.py
```

## 🔧 Configuration

### Adding New Opportunity Sources

Edit `scraper/config.py` to add new sources:

```python
NEW_SOURCE = SourceConfig(
    name="new_source",
    display_name="New Source",
    base_url="https://example.com",
    discovery_method="wp_rest_api",  # or "rss_feed" or "html_scrape"
    discovery_endpoint="/wp-json/wp/v2/posts",
    excluded_categories=["Blog", "News"],
    limit=10,
    check_title_for_deadline=True,
    default_remote=False,
)

SOURCES: dict[str, SourceConfig] = {
    "new_source": NEW_SOURCE,
    # ... other sources
}
```

Then add the domain to allowlists:
- `lib/ai/browsing-tools.ts` - `ALLOWED_DOMAINS`
- `scraper/agentic_crawler.py` - `ALLOWED_DOMAINS` and `STARTING_URLS`

### Enabling Agentic Crawler

Set the environment variable:
```bash
export RUN_AGENTIC_CRAWLER=true
python scraper/main.py
```

The agentic crawler will:
- Start from configured source homepages
- Use AI to decide which links to follow
- Extract opportunities from relevant pages
- Respect fetch budgets and robots.txt
- Log the crawl path for debugging

## 📊 Database Schema

### Tables

**profiles**
- User profile information (education, interests, skills, goals, etc.)

**opportunities**
- Opportunity data (title, description, type, deadline, etc.)
- Unique constraint on `source_url` for deduplication

**user_opportunities**
- User's tracked opportunities with status
- Links profiles to opportunities

**chat_messages**
- Chat conversation history
- Supports conversation grouping

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Domain allowlist enforcement for agentic crawling
- robots.txt respect for ethical scraping
- No API keys exposed in client-side code

## 📈 Monitoring & Logging

### Source Reliability

The scraper tracks source reliability metrics:
- Success rate
- Freshness rate (non-expired opportunities)
- Response times
- Error rates

View source performance:
```python
from scraper.reliability import print_source_report
print_source_report()
```

### Crawler Logging

The agentic crawler logs:
- URLs visited
- Actions taken (extracted, skipped, followed)
- Reasons for decisions
- Extraction results

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

[Your License Here]

## 🙏 Acknowledgments

- Groq for fast AI inference
- Supabase for backend infrastructure
- Resend for email services
- The open-source community

## 📞 Support

For support, please open an issue in the GitHub repository or contact [your email].
