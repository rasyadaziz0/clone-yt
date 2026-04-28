import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function getSafeRedirect(next: string | null): string {
  if (!next) return '/';
  if (next.startsWith('/') && !next.startsWith('//')) return next;
  return '/';
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const next = getSafeRedirect(searchParams.get('next'));

  if (error) {
    const params = new URLSearchParams({ error, description: errorDescription || '' });
    return NextResponse.redirect(`${origin}/login?${params}`);
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError);
      return NextResponse.redirect(`${origin}/login?error=code_exchange_failed`);
    }

    // Session set on server — now decide where to send the user
    const { data, error: userError } = await supabase.auth.getUser();

    if (userError || !data.user) {
      return NextResponse.redirect(`${origin}/login?error=no_session`);
    }

    if (next !== '/') {
      return NextResponse.redirect(`${origin}${next}`);
    }

    const { data: userData } = await supabase
      .from('users')
      .select('youtube_video_id')
      .eq('id', data.user.id)
      .single();

    const destination = userData?.youtube_video_id ? '/' : '/setup';
    return NextResponse.redirect(`${origin}${destination}`);
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
