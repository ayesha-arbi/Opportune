-- ============================================
-- OPPORTUNE SEED DATA
-- 18 representative opportunities so the chat, dashboard, and tracker have
-- something to work with before the scraper has run.
--
-- NOTE: deadlines/links are illustrative seed entries (typed by hand from
-- the platforms' typical cycles) — treat them as sample data and let the
-- scraper replace/refresh them over time.
-- Run in the Supabase SQL editor. Safe on an empty table; skip if your
-- opportunities table already has rows.
-- ============================================

insert into public.opportunities
    (title, description, type, field_tags, eligibility, organizer, location, is_remote, deadline, start_date, prize_info, source_url, source_name, application_url)
values

-- Hackathons
('HackHarvard 2026',
 'A 36-hour hackathon in Cambridge bringing together student builders around AI, web, and social-impact tracks, with mentor hours and sponsor prizes.',
 'hackathon', array['ai', 'web development', 'entrepreneurship'],
 '{"edu_level": ["undergraduate", "graduate"], "region": ["global"]}',
 'Harvard University', 'Cambridge, MA', false,
 '2026-09-25T23:59:59Z', '2026-10-10T09:00:00Z', '$10,000 in prizes',
 'https://hackharvard.io', 'HackHarvard', 'https://hackharvard.io/apply'),

('MLH Global Hack Week: AI Edition',
 'A week-long virtual hackathon series by Major League Hacking focused on shipping small AI projects daily, with community Discord support and swag.',
 'hackathon', array['ai', 'machine learning', 'python'],
 '{"edu_level": [], "region": ["global"]}',
 'Major League Hacking', 'Online', true,
 '2026-09-08T23:59:59Z', '2026-09-14T09:00:00Z', 'Swag and sponsor prizes',
 'https://mlh.io/seasons/2026/events', 'Major League Hacking', 'https://mlh.io/seasons/2026/events'),

('TreeHacks 2027',
 'Stanford''s flagship 36-hour hackathon; applications open in the fall with travel support for selected hackers worldwide.',
 'hackathon', array['ai', 'full stack', 'hardware'],
 '{"edu_level": ["undergraduate", "graduate"], "region": ["global"]}',
 'Stanford University', 'Stanford, CA', false,
 '2026-11-30T23:59:59Z', '2027-02-13T09:00:00Z', '$25,000 in prizes',
 'https://treehacks.stanford.edu', 'TreeHacks', 'https://treehacks.stanford.edu/apply'),

('Google Solution Challenge 2027',
 'Build a project with Google technologies that solves one of the UN Sustainable Development Goals; top teams fly to Google for the final showcase.',
 'hackathon', array['android', 'flutter', 'ai', 'sustainability'],
 '{"edu_level": ["undergraduate", "graduate"], "region": ["global"]}',
 'Google Developers', 'Hybrid (regional + Mountain View finals)', true,
 '2026-12-15T23:59:59Z', '2027-01-05T09:00:00Z', 'Swarovski-tier prizes + Google HQ showcase',
 'https://developers.google.com/community/gdsc/solution-challenge', 'Google', 'https://developers.google.com/community/gdsc/solution-challenge'),

('Hack the North 2026',
 'Canada''s biggest student hackathon, known for strong sponsor recruiting and overnight hacking at the University of Waterloo.',
 'hackathon', array['hackathon', 'software', 'startup'],
 '{"edu_level": ["undergraduate", "graduate"], "region": ["global"]}',
 'University of Waterloo', 'Waterloo, Canada', false,
 '2026-09-30T23:59:59Z', '2026-10-16T09:00:00Z', '$15,000 in prizes',
 'https://hackthenorth.com', 'Hack the North', 'https://hackthenorth.com/apply'),

-- Competitions
('Kaggle Competition: AI Mathematical Olympiad',
 'Solve frontier math problems unseen by models, advancing AI reasoning. Team-based Kaggle competition hosted with xAI and The Millennium Prize Project.',
 'competition', array['machine learning', 'data science', 'mathematics'],
 '{"edu_level": [], "region": ["global"]}',
 'Kaggle', 'Online', true,
 '2026-10-15T23:59:59Z', '2026-09-20T09:00:00Z', '$1,000,000 prize pool',
 'https://www.kaggle.com/competitions', 'Kaggle', 'https://www.kaggle.com/competitions'),

('Imagine Cup 2027',
 'Microsoft''s global student tech competition: build with Azure + AI, progress through national and world finals, and pitch to Microsoft leadership.',
 'competition', array['ai', 'azure', 'software', 'entrepreneurship'],
 '{"edu_level": ["undergraduate", "graduate"], "region": ["global"]}',
 'Microsoft', 'Hybrid (online rounds + world finals)', true,
 '2026-12-10T23:59:59Z', '2027-01-15T09:00:00Z', '$100,000 + Microsoft mentorship',
 'https://imaginecup.microsoft.com', 'Microsoft Imagine Cup', 'https://imaginecup.microsoft.com/apply'),

('ICPC 2026 Regional Contests',
 'The International Collegiate Programming Championship regionals: three-person teams solving algorithmic problems for a spot at World Finals.',
 'competition', array['algorithms', 'competitive programming', 'computer science'],
 '{"edu_level": ["undergraduate"], "region": ["global"]}',
 'ICPC Foundation', 'Regional universities', false,
 '2026-10-01T23:59:59Z', '2026-11-05T09:00:00Z', 'World Finals qualification',
 'https://icpc.global', 'ICPC', 'https://icpc.global/regionals/register'),

('James Dyson Award 2026',
 'International design engineering challenge for students and recent graduates: invent something that solves a real problem; national winners progress globally.',
 'competition', array['design', 'engineering', 'product'],
 '{"edu_level": ["undergraduate", "graduate"], "region": ["global"]}',
 'James Dyson Foundation', 'Online + national stages', true,
 '2026-09-16T23:59:59Z', '2026-11-01T09:00:00Z', '£30,000 international prize',
 'https://www.jamesdysonaward.org', 'James Dyson Award', 'https://www.jamesdysonaward.org/enter'),

('D&AD New Blood Awards 2026',
 'Real creative briefs from global brands for students and young creatives across design, advertising, and UX; Pencil winners get industry doors opened.',
 'competition', array['design', 'branding', 'ux'],
 '{"edu_level": ["undergraduate", "graduate"], "region": ["global"]}',
 'D&AD', 'Online', true,
 '2026-09-20T23:59:59Z', '2026-10-20T09:00:00Z', 'Yellow Pencil + industry placements',
 'https://www.dandad.org/en/new-blood-awards/', 'D&AD', 'https://www.dandad.org/en/new-blood-awards/enter'),

-- Fellowships
('Y Combinator Winter 2027 Batch',
 'Three-month accelerator in San Francisco for early-stage startups; standard $500k investment and weekly partner office hours. Apply as a founding team.',
 'fellowship', array['entrepreneurship', 'startups', 'product'],
 '{"edu_level": [], "region": ["global"]}',
 'Y Combinator', 'San Francisco, CA', false,
 '2026-10-27T23:59:59Z', '2027-01-05T09:00:00Z', '$500,000 standard deal',
 'https://www.ycombinator.com/apply', 'Y Combinator', 'https://www.ycombinator.com/apply'),

('Hertz Fellowship 2027',
 'Five years of funding and a lifelong community for doctoral students pursuing bold applied science and engineering research in the US.',
 'fellowship', array['research', 'engineering', 'applied science'],
 '{"edu_level": ["graduate", "phd"], "region": ["united states"]}',
 'Fannie & John Hertz Foundation', 'United States', false,
 '2026-10-15T23:59:59Z', '2027-08-01T09:00:00Z', 'Up to $250,000 over five years',
 'https://www.hertzfoundation.org', 'Hertz Foundation', 'https://www.hertzfoundation.org/the-fellowship/apply'),

('Schwarzman Scholars 2028',
 'One-year fully funded master''s at Tsinghua University in Beijing, developing future leaders with a global perspective on China.',
 'fellowship', array['leadership', 'policy', 'international relations'],
 '{"edu_level": ["undergraduate", "graduate"], "region": ["global"]}',
 'Schwarzman College, Tsinghua University', 'Beijing, China', false,
 '2026-09-22T23:59:59Z', '2027-08-15T09:00:00Z', 'Full tuition + stipend + travel',
 'https://www.schwarzmanscholars.org', 'Schwarzman Scholars', 'https://www.schwarzmanscholars.org/admissions/apply'),

-- Research programs
('DAAD RISE Germany 2027',
 'Summer research internships for undergraduate students in STEM: pair with German doctoral researchers on hands-on projects for three months, fully funded.',
 'research', array['research', 'stem', 'internship'],
 '{"edu_level": ["undergraduate"], "region": ["global"]}',
 'DAAD (German Academic Exchange Service)', 'Germany', false,
 '2026-12-15T23:59:59Z', '2027-06-01T09:00:00Z', 'Funded stay + travel allowance',
 'https://www.daad.de/rise/en/', 'DAAD RISE', 'https://www.daad.de/rise/en/rise-germany/'),

('Mitacs Globalink Research Internship 2027',
 ' Twelve-week faculty-supervised research internships at Canadian universities for international undergraduates, with a funded travel and stipend package.',
 'research', array['research', 'canada', 'stem'],
 '{"edu_level": ["undergraduate"], "region": ["global"]}',
 'Mitacs', 'Canada', false,
 '2026-09-24T23:59:59Z', '2027-05-01T09:00:00Z', 'Funded internship + travel',
 'https://www.mitacs.ca/our-programs/globalink-research-internship-students/', 'Mitacs', 'https://www.mitacs.ca/our-programs/globalink-research-internship-students/apply'),

('Max Planck Student Internship Program',
 'Research internships across the Max Planck Institutes in Germany for exceptional students in natural sciences, computer science, and mathematics.',
 'research', array['research', 'physics', 'computer science', 'biology'],
 '{"edu_level": ["undergraduate", "graduate"], "region": ["global"]}',
 'Max Planck Society', 'Germany', false,
 '2026-11-15T23:59:59Z', '2027-03-01T09:00:00Z', 'Paid internship contract',
 'https://www.mpg.de/career', 'Max Planck Society', 'https://www.mpg.de/career'),

-- Grants / scholarships
('Generation Google Scholarship 2027',
 'Financial support plus a Google community for students in computer science who show academic promise and commitment to diversity in tech.',
 'grant', array['computer science', 'scholarship', 'diversity'],
 '{"edu_level": ["undergraduate", "graduate"], "region": ["global"]}',
 'Google', 'Online', true,
 '2026-12-01T23:59:59Z', '2027-08-01T09:00:00Z', '$10,000 (US) or €7,000 (Europe)',
 'https://buildyourfuture.withgoogle.com/scholarships', 'Google', 'https://buildyourfuture.withgoogle.com/scholarships'),

('GitHub Campus Experts 2026',
 'Training and support for student leaders who build technical communities on campus: public speaking, community growth, and direct GitHub access.',
 'grant', array['community', 'developer relations', 'open source'],
 '{"edu_level": ["undergraduate", "graduate"], "region": ["global"]}',
 'GitHub', 'Online', true,
 '2026-10-05T23:59:59Z', '2026-11-01T09:00:00Z', 'Training + GitHub campus resources',
 'https://github.com/campus-experts', 'GitHub Education', 'https://github.com/campus-experts/apply'),

-- Other
('AIESEC Global Volunteer Program 2026',
 'Six-to-eight-week cross-cultural volunteering placements with host organizations worldwide, focused on leadership development and the UN SDGs.',
 'other', array['leadership', 'volunteering', 'sustainability'],
 '{"edu_level": ["undergraduate", "graduate"], "region": ["global"]}',
 'AIESEC', 'Global placements', false,
 '2026-10-30T23:59:59Z', '2027-01-10T09:00:00Z', 'Self-funded placement (stipends vary by host)',
 'https://aiesec.org/global-volunteer', 'AIESEC', 'https://aiesec.org/global-volunteer');
