import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function getServerYouTubeAccessToken(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.provider_token ?? null;
}

export async function youtubeAuthFetch(
  url: string,
  accessToken: string,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  headers.set('Accept', 'application/json');
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...init,
    headers,
    cache: 'no-store',
  });
}
