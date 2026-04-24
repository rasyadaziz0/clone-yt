import { NextRequest, NextResponse } from 'next/server';

const YOUTUBE_ORIGIN = 'www.googleapis.com';
const YOUTUBE_PATH_PREFIX = '/youtube/v3/';

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

export async function GET(req: NextRequest) {
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

  if (upstreamUrl.hostname !== YOUTUBE_ORIGIN || !upstreamUrl.pathname.startsWith(YOUTUBE_PATH_PREFIX)) {
    return NextResponse.json({ error: 'Unsupported upstream URL' }, { status: 400 });
  }

  for (const key of apiKeys) {
    upstreamUrl.searchParams.delete('key');
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

      return NextResponse.json(parsed ?? { error: 'YouTube request failed' }, { status: upstreamRes.status });
    }

    const data = await upstreamRes.json();
    return NextResponse.json(data, { status: 200 });
  }

  return NextResponse.json(
    { error: 'All YouTube API keys exhausted' },
    { status: 429 }
  );
}
