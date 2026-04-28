import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

interface UseUserVideoReturn {
  user: User | null;
  videoId: string | null;
  isLoading: boolean;
}

export function useUserVideo(): UseUserVideoReturn {
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auth state listener
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Fetch user's personal video from 'users' table
  useEffect(() => {
    const fetchUserVideo = async () => {
      setIsLoading(true);

      try {
        // 1. Dapatkan user yang sedang login
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          window.location.replace('/login');
          return;
        }

        // 2. Ambil data youtube_video_id dari tabel 'users'
        const { data, error } = await supabase
          .from('users')
          .select('youtube_video_id')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
        }

        // 3. Jika user punya video, tampilkan. Jika tidak, arahkan ke /setup
        if (data?.youtube_video_id) {
          setVideoId(data.youtube_video_id);
        } else {
          window.location.replace('/setup');
          return;
        }
      } finally {
        // Always clear loading — even on error, so the screen never freezes
        setIsLoading(false);
      }
    };

    fetchUserVideo();
  }, [supabase]);

  return { user, videoId, isLoading };
}
