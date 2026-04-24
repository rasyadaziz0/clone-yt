import { NextRequest, NextResponse } from 'next/server';
import { getServerYouTubeAccessToken, youtubeAuthFetch } from '@/lib/youtube/server';

const YOUTUBE_SEND_URL = 'https://www.googleapis.com/youtube/v3/liveChat/messages?part=snippet';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const liveChatId = body?.liveChatId;
  const messageText = body?.messageText;

  if (!liveChatId || typeof liveChatId !== 'string') {
    return NextResponse.json({ error: 'Invalid liveChatId' }, { status: 400 });
  }

  if (!messageText || typeof messageText !== 'string') {
    return NextResponse.json({ error: 'Invalid messageText' }, { status: 400 });
  }

  const accessToken = await getServerYouTubeAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = await youtubeAuthFetch(YOUTUBE_SEND_URL, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      snippet: {
        liveChatId,
        type: 'textMessageEvent',
        textMessageDetails: { messageText },
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }

  return NextResponse.json({ success: true, id: data.id ?? null });
}
