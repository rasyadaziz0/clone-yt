import { NextRequest, NextResponse } from 'next/server';
import { getServerYouTubeAccessToken, youtubeAuthFetch } from '@/lib/youtube/server';

const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3/subscriptions';

export async function GET(req: NextRequest) {
  const channelId = req.nextUrl.searchParams.get('channelId');
  if (!channelId) {
    return NextResponse.json({ error: 'Missing channelId' }, { status: 400 });
  }

  const accessToken = await getServerYouTubeAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = await youtubeAuthFetch(
    `${YOUTUBE_BASE}?part=snippet&mine=true&forChannelId=${encodeURIComponent(channelId)}`,
    accessToken
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }

  const firstItem = Array.isArray(data.items) ? data.items[0] : null;
  return NextResponse.json({
    isSubscribed: !!firstItem?.id,
    subscriptionId: firstItem?.id ?? null,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const channelId = body?.channelId;
  if (!channelId || typeof channelId !== 'string') {
    return NextResponse.json({ error: 'Invalid channelId' }, { status: 400 });
  }

  const accessToken = await getServerYouTubeAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = await youtubeAuthFetch(
    `${YOUTUBE_BASE}?part=snippet`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        snippet: {
          resourceId: {
            kind: 'youtube#channel',
            channelId,
          },
        },
      }),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }

  return NextResponse.json({ id: data.id ?? null });
}
