import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

// SSRF / Private IP protection helper
function isPrivateIP(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    // Allow localhost during local batch testing if explicitly allowed
    if (process.env.ALLOW_LOCAL_CRAWL === 'true' || host === 'localhost' || host === '127.0.0.1') {
      return false;
    }
    if (host === '0.0.0.0' || host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('169.254.')) {
      return true;
    }
    return false;
  } catch (e) {
    return true; // Invalid URL is treated as private/unsafe
  }
}

// Clean HTML text extraction
function extractCleanText(htmlStr) {
  const $ = cheerio.load(htmlStr);
  $('script, style, noscript, iframe, svg, nav, footer, header').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return text.slice(0, 3000); // Truncate to reasonable token size
}

// robots.txt parser helper
async function checkRobotsTxt(originUrl, client) {
  try {
    const robotsUrl = new URL('/robots.txt', originUrl).toString();
    const res = await client.get(robotsUrl, { timeout: 3000 });
    const lines = (res.data || '').split('\n');
    const disallowed = [];
    let isTargetAgent = true;

    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      if (trimmed.startsWith('user-agent:')) {
        const agent = trimmed.split(':')[1]?.trim();
        isTargetAgent = agent === '*' || agent === 'ai-interview-prep-bot';
      } else if (isTargetAgent && trimmed.startsWith('disallow:')) {
        const rule = trimmed.split(':')[1]?.trim();
        if (rule) disallowed.push(rule);
      }
    }
    return disallowed;
  } catch (e) {
    // If robots.txt doesn't exist or times out, proceed permissively
    return [];
  }
}

// Request with exponential backoff on 429 / rate-limit failures
async function fetchWithBackoff(client, url, maxRetries = 2) {
  let delay = 500;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await client.get(url);
    } catch (err) {
      const status = err.response?.status;
      if ((status === 429 || (status >= 500 && status < 600)) && attempt < maxRetries) {
        console.warn(`[Crawler] Rate limited or server error (${status}) on ${url}. Backing off for ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2; // exponential backoff
      } else {
        throw err;
      }
    }
  }
}

// Public discussion search (Reddit, Glassdoor, engineering blogs)
async function searchPublicDiscussion(companyName, client) {
  if (!companyName || companyName === 'Target Company') return null;
  try {
    // Search public search endpoints for interview experiences
    const query = encodeURIComponent(`${companyName} interview process experience`);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${query}`;
    const res = await fetchWithBackoff(client, searchUrl);
    const $ = cheerio.load(res.data);
    const snippets = [];
    $('.result__snippet').each((i, el) => {
      if (i < 3) {
        const text = $(el).text().trim();
        if (text) snippets.push(text);
      }
    });

    if (snippets.length > 0) {
      return snippets.join(' | ');
    }
  } catch (e) {
    // Fall through gracefully if search is blocked or unavailable
  }
  return null;
}

export async function crawlCompanySite(companyUrl) {
  const result = {
    company_name: '',
    what_they_do: '',
    summary: '',
    pages_used: [],
    hiring_info: '',
    public_discussion: '',
    error: null
  };

  if (!companyUrl || companyUrl.trim() === '') {
    result.error = 'No company URL provided.';
    result.summary = 'No URL provided to crawl.';
    return result;
  }

  // Normalize URL
  let targetUrl = companyUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  if (isPrivateIP(targetUrl)) {
    result.error = 'URL blocked due to security validation (private/loopback address).';
    result.summary = 'Target URL rejected by security scanner.';
    return result;
  }

  const client = axios.create({
    timeout: 6000,
    maxContentLength: 2 * 1024 * 1024, // 2MB max
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-Interview-Prep-Bot/1.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9'
    }
  });

  try {
    // Check robots.txt
    const origin = new URL(targetUrl).origin;
    const disallowedPaths = await checkRobotsTxt(origin, client);

    const isDisallowed = (urlStr) => {
      try {
        const path = new URL(urlStr).pathname;
        return disallowedPaths.some(dp => dp !== '/' && path.startsWith(dp));
      } catch (e) {
        return false;
      }
    };

    // 1. Fetch main page with backoff
    console.log(`[Crawler] Fetching main URL: ${targetUrl}`);
    const resMain = await fetchWithBackoff(client, targetUrl);
    result.pages_used.push(targetUrl);

    const $main = cheerio.load(resMain.data);
    const pageTitle = $main('title').text().trim() || $main('meta[property="og:title"]').attr('content') || '';
    const metaDesc = $main('meta[name="description"]').attr('content') || $main('meta[property="og:description"]').attr('content') || '';
    const mainText = extractCleanText(resMain.data);

    result.company_name = pageTitle.split('|')[0].split('-')[0].trim() || 'Target Company';
    result.what_they_do = metaDesc || mainText.slice(0, 300);

    // 2. Discover and rank candidate links (careers, jobs, about, hiring, engineering blog, handbook)
    const candidates = [];
    const keywords = ['career', 'careers', 'job', 'jobs', 'about', 'hiring', 'interview', 'engineering', 'culture', 'join', 'handbook', 'team'];

    $main('a[href]').each((_, el) => {
      const href = $main(el).attr('href');
      if (!href) return;
      try {
        const absUrl = new URL(href, targetUrl).toString();
        const lowerHref = href.toLowerCase();
        
        // Ensure same domain and respects robots.txt
        if (new URL(absUrl).hostname === new URL(targetUrl).hostname && !isDisallowed(absUrl)) {
          const score = keywords.reduce((acc, kw) => (lowerHref.includes(kw) ? acc + 10 : acc), 0);
          if (score > 0 && !result.pages_used.includes(absUrl)) {
            candidates.push({ url: absUrl, score });
          }
        }
      } catch (e) {
        // Ignore malformed hrefs
      }
    });

    // Sort candidate links by relevance score
    candidates.sort((a, b) => b.score - a.score);

    // Fetch top candidate page (e.g. /careers or /about)
    if (candidates.length > 0) {
      const topPage = candidates[0].url;
      try {
        console.log(`[Crawler] Fetching discovery URL: ${topPage}`);
        const resSub = await fetchWithBackoff(client, topPage);
        result.pages_used.push(topPage);
        const subText = extractCleanText(resSub.data);
        if (topPage.toLowerCase().includes('career') || topPage.toLowerCase().includes('job') || topPage.toLowerCase().includes('hiring')) {
          result.hiring_info = subText.slice(0, 1000);
        }
      } catch (subErr) {
        console.warn(`[Crawler] Sub-page crawl failed for ${topPage} (reporting and skipping):`, subErr.message);
      }
    }

    // 3. Search public discussions regarding interview process
    console.log(`[Crawler] Checking public discussion for: ${result.company_name}`);
    const publicDiscussion = await searchPublicDiscussion(result.company_name, client);
    if (publicDiscussion) {
      result.public_discussion = publicDiscussion.slice(0, 600);
      result.hiring_info += (result.hiring_info ? '\n\n' : '') + `Public Discussion Insights: ${result.public_discussion}`;
    }

    result.summary = `${result.company_name} operates at ${new URL(targetUrl).hostname}. ${result.what_they_do.slice(0, 250)}`;

  } catch (err) {
    console.warn(`[Crawler] Crawl failed for ${targetUrl}:`, err.message);
    result.error = `Could not crawl ${targetUrl}: ${err.message}`;
    result.summary = `Company site ${targetUrl} could not be retrieved (${err.message}). Proceeding with job description analysis alone.`;
    result.pages_used = [targetUrl];
  }

  return result;
}
