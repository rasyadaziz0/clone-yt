import { NextResponse } from 'next/server';
import { getServerYouTubeAccessToken, youtubeAuthFetch } from '@/lib/youtube/server';

const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3/subscriptions';

interface RouteParams {
  params: Promise<{
    subscriptionId: string;
  }>;
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const { subscriptionId } = await params;
  if (!subscriptionId) {
    return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 });
  }

  const accessToken = await getServerYouTubeAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = await youtubeAuthFetch(
    `${YOUTUBE_BASE}?id=${encodeURIComponent(subscriptionId)}`,
    accessToken,
    { method: 'DELETE' }
  );

  if (response.status === 204) {
    return NextResponse.json({ success: true });
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }

  return NextResponse.json({ success: true });
}
