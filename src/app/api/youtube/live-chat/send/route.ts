import { NextRequest, NextResponse } from 'next/server';
import { getServerYouTubeAccessToken, youtubeAuthFetch } from '@/lib/youtube/server';
import { z } from 'zod';

const YOUTUBE_SEND_URL = 'https://www.googleapis.com/youtube/v3/liveChat/messages?part=snippet';
const sendLiveChatSchema = z.object({
  liveChatId: z.string().min(1, 'Invalid liveChatId'),
  messageText: z.string().min(1, 'Invalid messageText').max(200, 'Message too long'),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsedBody = sendLiveChatSchema.safeParse(body);
  if (!parsedBody.success) {
    const issue = parsedBody.error.issues[0];
    return NextResponse.json({ error: issue?.message ?? 'Invalid request payload' }, { status: 400 });
  }
  const { liveChatId, messageText } = parsedBody.data;

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
