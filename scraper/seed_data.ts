import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

let envContent = '';
if (fs.existsSync('.env.local')) {
  envContent = fs.readFileSync('.env.local', 'utf8');
} else if (fs.existsSync('.env')) {
  envContent = fs.readFileSync('.env', 'utf8');
}

const parsed: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    parsed[match[1]] = value.trim();
  }
}

const supabaseUrl = parsed.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = parsed.SUPABASE_SERVICE_ROLE_KEY || parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SEED_OPPORTUNITIES = [
  {
    title: "Global AI Agents & LLM Hackathon 2026",
    description: "Build autonomous AI agents, multi-agent workflows, and LLM-powered applications using modern reasoning models. $50,000 in cash and cloud credits across tracks including developer tools, healthcare AI, and autonomous agents.",
    type: "hackathon",
    field_tags: ["ai", "machine learning", "llm", "agents", "python", "software engineering"],
    eligibility: { edu_level: ["high_school", "undergraduate", "graduate", "phd", "professional"] },
    organizer: "AI Horizons & Open Source Collective",
    location: "Global / Remote",
    is_remote: true,
    deadline: "2026-09-30T23:59:59Z",
    start_date: "2026-09-15T00:00:00Z",
    end_date: "2026-10-02T23:59:59Z",
    prize_info: "$50,000 Total Prize Pool + GPU Credits",
    source_url: "https://devpost.com/hackathons/global-ai-agents-2026",
    source_name: "Devpost",
    application_url: "https://devpost.com/hackathons/global-ai-agents-2026",
    is_active: true,
  },
  {
    title: "Kaggle Global Machine Learning Innovation Challenge",
    description: "Develop novel deep learning architectures and predictive models on complex real-world multimodal datasets. Open to individual researchers and student teams worldwide.",
    type: "competition",
    field_tags: ["machine learning", "deep learning", "ai", "data science", "python", "research"],
    eligibility: { edu_level: ["undergraduate", "graduate", "phd", "postdoc"] },
    organizer: "Kaggle & Google DeepMind",
    location: "Online",
    is_remote: true,
    deadline: "2026-10-15T23:59:59Z",
    start_date: "2026-09-01T00:00:00Z",
    end_date: "2026-10-20T23:59:59Z",
    prize_info: "$100,000 in Prizes & NeurIPS Workshop Presentation",
    source_url: "https://kaggle.com/competitions/global-ml-challenge-2026",
    source_name: "Kaggle",
    application_url: "https://kaggle.com/competitions/global-ml-challenge-2026",
    is_active: true,
  },
  {
    title: "MLH Global Hack Week: Artificial Intelligence Edition",
    description: "A week-long global hackathon dedicated to artificial intelligence, neural networks, and generative models. Beginner friendly with specialized tracks for experienced undergrads.",
    type: "hackathon",
    field_tags: ["ai", "machine learning", "python", "web development", "hackathon"],
    eligibility: { edu_level: ["high_school", "undergraduate", "graduate"] },
    organizer: "Major League Hacking (MLH)",
    location: "Global Online",
    is_remote: true,
    deadline: "2026-09-28T23:59:59Z",
    start_date: "2026-09-22T00:00:00Z",
    end_date: "2026-09-29T23:59:59Z",
    prize_info: "$15,000 in tech gear, mentorship, and cloud credits",
    source_url: "https://mlh.io/events/global-hack-week-ai-2026",
    source_name: "Major League Hacking",
    application_url: "https://mlh.io/events/global-hack-week-ai-2026",
    is_active: true,
  },
  {
    title: "OpenAI & Anthropic Alignment Research Fellowship 2026",
    description: "Fully funded 6-month research fellowship for undergraduate and graduate students working on AI safety, model interpretability, and robust alignment methods.",
    type: "fellowship",
    field_tags: ["ai", "ai safety", "research", "deep learning", "nlp", "computer science"],
    eligibility: { edu_level: ["undergraduate", "graduate", "phd"] },
    organizer: "AI Alignment Initiative",
    location: "Remote / Hybrid (San Francisco option)",
    is_remote: true,
    deadline: "2026-10-30T23:59:59Z",
    start_date: "2026-11-15T00:00:00Z",
    end_date: "2027-05-15T00:00:00Z",
    prize_info: "$45,000 Research Stipend + Direct Faculty Mentorship",
    source_url: "https://alignmentfellowship.org/apply-2026",
    source_name: "Alignment Initiative",
    application_url: "https://alignmentfellowship.org/apply-2026",
    is_active: true,
  },
  {
    title: "Stanford Undergraduate Visiting Research Opportunity (SURF)",
    description: "Summer and remote academic-year undergraduate research fellowship in computer science, robotics, artificial intelligence, and bio-informatics.",
    type: "research",
    field_tags: ["research", "computer science", "ai", "robotics", "data science"],
    eligibility: { edu_level: ["undergraduate"] },
    organizer: "Stanford University",
    location: "Stanford, CA / Remote options",
    is_remote: true,
    deadline: "2026-11-01T23:59:59Z",
    start_date: "2027-01-10T00:00:00Z",
    end_date: "2027-06-10T00:00:00Z",
    prize_info: "Full tuition coverage, $10,000 living stipend, travel grant",
    source_url: "https://surf.stanford.edu/admissions-2026",
    source_name: "Stanford University",
    application_url: "https://surf.stanford.edu/admissions-2026",
    is_active: true,
  },
  {
    title: "NextGen Web3 & AI Builders Hackathon",
    description: "Combine decentralized infrastructure with machine learning models to create verifiable AI applications, decentralized inference networks, and smart agents.",
    type: "hackathon",
    field_tags: ["web3", "ai", "blockchain", "solidity", "python", "machine learning"],
    eligibility: { edu_level: ["undergraduate", "graduate", "professional"] },
    organizer: "Ethereum Foundation & AI Commons",
    location: "Online",
    is_remote: true,
    deadline: "2026-10-05T23:59:59Z",
    start_date: "2026-09-20T00:00:00Z",
    end_date: "2026-10-06T23:59:59Z",
    prize_info: "$75,000 in Grants and Bounty Prizes",
    source_url: "https://devpost.com/hackathons/web3-ai-builders-2026",
    source_name: "Devpost",
    application_url: "https://devpost.com/hackathons/web3-ai-builders-2026",
    is_active: true,
  },
  {
    title: "CERN Summer Student & Remote Computing Programme",
    description: "Work on large-scale distributed computing, scientific machine learning, and data pipelines for particle physics experiments. Open to international undergraduate and master's students.",
    type: "fellowship",
    field_tags: ["physics", "computing", "machine learning", "data science", "research"],
    eligibility: { edu_level: ["undergraduate", "graduate"] },
    organizer: "CERN",
    location: "Geneva, Switzerland & Remote",
    is_remote: true,
    deadline: "2026-11-15T23:59:59Z",
    start_date: "2027-06-01T00:00:00Z",
    end_date: "2027-08-31T00:00:00Z",
    prize_info: "CHF 90/day living allowance + travel and health coverage",
    source_url: "https://careers.cern/summer-student-programme",
    source_name: "CERN",
    application_url: "https://careers.cern/summer-student-programme",
    is_active: true,
  },
  {
    title: "Microsoft Imagine Cup 2026: AI for Good Track",
    description: "Global student technology competition where student teams build AI solutions addressing global challenges in healthcare, education, climate, and accessibility.",
    type: "competition",
    field_tags: ["ai", "azure", "cloud", "social impact", "software engineering", "entrepreneurship"],
    eligibility: { edu_level: ["high_school", "undergraduate", "graduate", "phd"] },
    organizer: "Microsoft",
    location: "Global Online",
    is_remote: true,
    deadline: "2026-10-25T23:59:59Z",
    start_date: "2026-09-01T00:00:00Z",
    end_date: "2026-11-15T23:59:59Z",
    prize_info: "$100,000 USD + Mentorship with Microsoft CEO Satya Nadella",
    source_url: "https://imaginecup.microsoft.com/en-us/Events",
    source_name: "Microsoft",
    application_url: "https://imaginecup.microsoft.com/en-us/Events",
    is_active: true,
  },
  {
    title: "Mozilla Tech Futures Open Source Research Grant",
    description: "Grants for student developers and researchers contributing to open source AI models, decentralized web standards, and privacy-preserving machine learning.",
    type: "grant",
    field_tags: ["open source", "ai", "privacy", "web development", "research"],
    eligibility: { edu_level: ["undergraduate", "graduate", "phd", "professional"] },
    organizer: "Mozilla Foundation",
    location: "Global Remote",
    is_remote: true,
    deadline: "2026-10-31T23:59:59Z",
    start_date: "2026-11-01T00:00:00Z",
    end_date: "2027-04-30T23:59:59Z",
    prize_info: "$20,000 Unrestricted Grant per project",
    source_url: "https://foundation.mozilla.org/grants-2026",
    source_name: "Mozilla Foundation",
    application_url: "https://foundation.mozilla.org/grants-2026",
    is_active: true,
  },
  {
    title: "Google Summer of Code (GSoC) 2026 Mentorship",
    description: "International program bringing student developers into open source software development organizations with stipends and 1-on-1 industry mentorship.",
    type: "fellowship",
    field_tags: ["open source", "software engineering", "python", "ai", "machine learning"],
    eligibility: { edu_level: ["undergraduate", "graduate", "phd"] },
    organizer: "Google",
    location: "Remote",
    is_remote: true,
    deadline: "2026-11-20T23:59:59Z",
    start_date: "2027-05-01T00:00:00Z",
    end_date: "2027-08-31T00:00:00Z",
    prize_info: "$3,000 - $6,000 Stipend based on project size",
    source_url: "https://summerofcode.withgoogle.com",
    source_name: "Google",
    application_url: "https://summerofcode.withgoogle.com",
    is_active: true,
  }
];

async function seed() {
  console.log('Seeding opportunities into Supabase...');
  for (const opp of SEED_OPPORTUNITIES) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('opportunities')
      .select('id')
      .eq('source_url', opp.source_url)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await supabase
        .from('opportunities')
        .update(opp)
        .eq('id', existing.id);
      if (updateErr) {
        console.error(`Failed to update "${opp.title}":`, updateErr.message);
      } else {
        console.log(`✓ Updated: ${opp.title}`);
      }
    } else {
      const { error: insertErr } = await supabase
        .from('opportunities')
        .insert(opp);
      if (insertErr) {
        console.error(`Failed to insert "${opp.title}":`, insertErr.message);
      } else {
        console.log(`✓ Inserted: ${opp.title} (${opp.type}) - Deadline: ${opp.deadline}`);
      }
    }
  }
  console.log('Seeding complete!');
}

seed();
