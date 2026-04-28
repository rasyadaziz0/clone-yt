import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// ── Constants ──────────────────────────────────────────────────────────────
const YOUTUBE_ORIGIN = 'www.googleapis.com';
const YOUTUBE_PATH_PREFIX = '/youtube/v3/';

// Rate-limit: max 30 requests per IP per minute (sliding window)
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

// ── In-memory rate-limit store (per-instance; sufficient for Edge/Node) ────
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  entry.count += 1;
  return false;
}

// ── API key pool ──────────────────────────────────────────────────────────
const apiKeys = [
  process.env.YOUTUBE_API_KEY1,
  process.env.YOUTUBE_API_KEY2,
  process.env.YOUTUBE_API_KEY3,
  process.env.YOUTUBE_API_KEY4,
  process.env.YOUTUBE_API_KEY5,
  process.env.YOUTUBE_API_KEY6,
  process.env.YOUTUBE_API_KEY,
].filter(Boolean) as string[];

function isQuotaExceeded(status: number, body: unknown): boolean {
  if (status !== 403 || !body || typeof body !== 'object') return false;
  const maybeError = (body as { error?: { errors?: Array<{ reason?: string }> } }).error;
  return maybeError?.errors?.some((item) => item.reason === 'quotaExceeded') ?? false;
}

// ── Route handler ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // ── 1. Authentication: require a valid Supabase session ────────────────
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Rate limiting: 30 req / IP / minute ─────────────────────────────
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)),
        },
      }
    );
  }

  // ── 3. Input validation ────────────────────────────────────────────────
  const target = req.nextUrl.searchParams.get('url');

  if (!target) {
    return NextResponse.json({ error: 'Missing url query parameter' }, { status: 400 });
  }

  if (apiKeys.length === 0) {
    return NextResponse.json({ error: 'No server-side YouTube API key configured' }, { status: 500 });
  }

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(target);
  } catch {
    return NextResponse.json({ error: 'Invalid url query parameter' }, { status: 400 });
  }

  // Only allow requests to the YouTube Data API v3
  if (
    upstreamUrl.hostname !== YOUTUBE_ORIGIN ||
    !upstreamUrl.pathname.startsWith(YOUTUBE_PATH_PREFIX)
  ) {
    return NextResponse.json({ error: 'Unsupported upstream URL' }, { status: 400 });
  }

  // Strip any client-supplied API key — server keys are injected below
  upstreamUrl.searchParams.delete('key');

  // ── 4. Key-rotation & upstream fetch ───────────────────────────────────
  for (const key of apiKeys) {
    upstreamUrl.searchParams.set('key', key);

    const upstreamRes = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!upstreamRes.ok) {
      let parsed: unknown = null;
      const text = await upstreamRes.text();
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }
      }

      if (isQuotaExceeded(upstreamRes.status, parsed)) {
        continue;
      }

      return NextResponse.json(
        parsed ?? { error: 'YouTube request failed' },
        { status: upstreamRes.status }
      );
    }

    const data = await upstreamRes.json();
    return NextResponse.json(data, { status: 200 });
  }

  return NextResponse.json(
    { error: 'All YouTube API keys exhausted' },
    { status: 429 }
  );
}
