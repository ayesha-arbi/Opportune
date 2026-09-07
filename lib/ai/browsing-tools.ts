/**
 * Shared browsing tools for agentic scraping.
 * Used by both background crawler and live in-chat browsing.
 */

import { groqChatCompletion } from './groq';

interface GroqMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

// Domain allowlist - only these domains can be fetched
const ALLOWED_DOMAINS = [
  'opportunitiescorners.com',
  'www.opportunitiescircle.com',
  'devpost.com',
  'mlh.io',
  'scholarships-positions.com',
  'youthopportunities.org',
  'fullyfundedscholarships.com',
  // Add more domains as sources are added
];

// robots.txt cache to avoid repeated checks
const robotsTxtCache = new Map<string, boolean>();

interface FetchPageResult {
  html: string;
  text: string;
  links: Array<{ href: string; text: string }>;
  error?: string;
}

interface BrowsingConfig {
  maxFetches: number;
  currentFetches: number;
  allowlist: string[];
}

/**
 * Extract domain from URL for allowlist checking
 */
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Check if domain is in allowlist
 */
export function isDomainAllowed(url: string): boolean {
  const domain = extractDomain(url);
  if (!domain) return false;
  
  return ALLOWED_DOMAINS.some(allowed => 
    domain === allowed || domain.endsWith(`.${allowed}`)
  );
}

/**
 * Check robots.txt for a domain (cached)
 */
export async function checkRobotsTxt(domain: string): Promise<boolean> {
  if (robotsTxtCache.has(domain)) {
    return robotsTxtCache.get(domain)!;
  }

  try {
    const robotsUrl = `https://${domain}/robots.txt`;
    const response = await fetch(robotsUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'OpportuneBot/1.0' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      // If robots.txt is not available, allow crawling
      robotsTxtCache.set(domain, true);
      return true;
    }

    const robotsTxt = await response.text();
    
    // Simple check - if User-agent: * has Disallow: /, then block
    // This is a basic implementation - for production, use a proper robots.txt parser
    const isAllowed = !robotsTxt.toLowerCase().includes('disallow: /');
    
    robotsTxtCache.set(domain, isAllowed);
    return isAllowed;
  } catch (error) {
    // On error, allow crawling (fail open)
    robotsTxtCache.set(domain, true);
    return true;
  }
}

/**
 * Fetch a page and extract content and links
 * Enforces domain allowlist and fetch budget
 */
export async function fetchPage(
  url: string,
  config: BrowsingConfig
): Promise<FetchPageResult> {
  // Check fetch budget
  if (config.currentFetches >= config.maxFetches) {
    return {
      html: '',
      text: '',
      links: [],
      error: 'Fetch budget exceeded'
    };
  }

  // Check domain allowlist
  if (!isDomainAllowed(url)) {
    return {
      html: '',
      text: '',
      links: [],
      error: `Domain not in allowlist: ${extractDomain(url)}`
    };
  }

  // Check robots.txt
  const domain = extractDomain(url);
  if (domain && !(await checkRobotsTxt(domain))) {
    return {
      html: '',
      text: '',
      links: [],
      error: `robots.txt disallows crawling: ${domain}`
    };
  }

  config.currentFetches++;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return {
        html: '',
        text: '',
        links: [],
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const html = await response.text();
    
    // Extract readable text (basic implementation)
    const text = extractReadableText(html);
    
    // Extract links
    const links = extractLinks(html, url);

    return { html, text, links };
  } catch (error) {
    return {
      html: '',
      text: '',
      links: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Extract readable text from HTML
 */
function extractReadableText(html: string): string {
  // Remove script and style tags ([\s\S] instead of the `s` flag — works on all targets)
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Limit length
  return text.slice(0, 15000);
}

/**
 * Extract links from HTML
 */
function extractLinks(html: string, baseUrl: string): Array<{ href: string; text: string }> {
  const links: Array<{ href: string; text: string }> = [];
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].trim();
    
    // Resolve relative URLs
    let absoluteUrl = href;
    if (href.startsWith('/')) {
      try {
        const baseUrlObj = new URL(baseUrl);
        absoluteUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}${href}`;
      } catch {
        continue;
      }
    } else if (!href.startsWith('http')) {
      continue; // Skip relative URLs without base
    }
    
    links.push({ href: absoluteUrl, text });
  }
  
  return links;
}

/**
 * Create a new browsing config
 */
export function createBrowsingConfig(maxFetches: number): BrowsingConfig {
  return {
    maxFetches,
    currentFetches: 0,
    allowlist: [...ALLOWED_DOMAINS],
  };
}

/**
 * Get remaining fetch budget
 */
export function getRemainingBudget(config: BrowsingConfig): number {
  return config.maxFetches - config.currentFetches;
}

/**
 * Extract opportunity data from page text using AI
 * Reuses the same extraction logic as the scraper
 */
export async function extractOpportunity(
  pageText: string,
  sourceUrl: string,
  sourceName: string,
  checkTitle: boolean = false,
  fieldTags: string[] = []
): Promise<Record<string, any> | null> {
  const systemPrompt = `You are an expert data extraction AI for Opportune.
Your job is to extract opportunity details (hackathons, research fellowships, competitions, grants) from raw web page content into structured JSON.

CRITICAL INSTRUCTIONS:
1. Output ONLY valid JSON matching the specified JSON schema.
2. Output null for any field you cannot clearly and explicitly find on the page — especially 'deadline', 'start_date', and 'end_date'.
3. NEVER guess, estimate, or hallucinate dates, prize amounts, or eligibility requirements. If a date is ambiguous or missing, set it to null.
4. Output ISO 8601 strings for dates if found (e.g., '2026-10-15T23:59:59Z').
5. 'type' MUST be one of: 'hackathon', 'fellowship', 'competition', 'research', 'grant', 'other'.
6. If the content is a guide, advice article, blog post, or informational content (not an actual opportunity with a deadline and application process), return null for all fields to skip extraction.`;

  const titleInstruction = checkTitle ? "IMPORTANT: Check both the title and body content for deadline information, as titles often contain key dates." : "";
  const tagsInstruction = fieldTags.length > 0 ? `Use these existing tags as field_tags: ${fieldTags.join(', ')}. Only add additional tags if clearly relevant.` : "";

  const userPrompt = `Extract opportunity information from the following page content.

Source URL: ${sourceUrl}
Platform Name: ${sourceName}

${titleInstruction}
${tagsInstruction}

Page Content:
---
${pageText.slice(0, 12000)}
---

Return a JSON object with these keys:
- title (string, required)
- description (string or null)
- type (one of: 'hackathon', 'fellowship', 'competition', 'research', 'grant', 'other')
- field_tags (array of string tags e.g. ['ai', 'web3'])
- eligibility (object with optional 'edu_level', 'region' or null)
- organizer (string or null)
- location (string or null)
- is_remote (boolean)
- deadline (ISO 8601 datetime string or null)
- start_date (ISO 8601 datetime string or null)
- end_date (ISO 8601 datetime string or null)
- prize_info (string or null)
- source_url (string, use '${sourceUrl}')
- source_name (string, use '${sourceName}')
- application_url (string or null)`;

  try {
    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await groqChatCompletion({
      messages,
      temperature: 0.1,
    });

    const content = response.content;
    if (!content) {
      return null;
    }

    // Parse JSON from the response (strip the ``` fence lines)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      const withoutFirstLine = jsonStr.slice(jsonStr.indexOf('\n') + 1);
      const end = withoutFirstLine.lastIndexOf('```');
      jsonStr = (end === -1 ? withoutFirstLine : withoutFirstLine.slice(0, end)).trim();
    }

    const extracted = JSON.parse(jsonStr);

    // Validate that it's an opportunity, not a guide
    if (!extracted.title || extracted.type === 'other' && !extracted.deadline) {
      return null;
    }

    // Ensure source fields are set
    extracted.source_url = sourceUrl;
    extracted.source_name = sourceName;
    if (fieldTags.length > 0) {
      extracted.field_tags = fieldTags;
    }

    return extracted;
  } catch (error) {
    console.error('AI extraction failed:', error);
    return null;
  }
}