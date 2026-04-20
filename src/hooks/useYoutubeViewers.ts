import { useState, useEffect, useMemo } from 'react';
import { ytService } from '@/services/YouTubeService';
import { createClient } from '@/lib/supabase/client';

export function useYoutubeViewers(videoId: string | undefined) {
    const [viewersCount, setViewersCount] = useState<number>(0);
    const [isLive, setIsLive] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<{ time: string; count: number; createdAt: number }[]>([]);
    
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        if (!videoId) return;

        let isMounted = true;
        let pollInterval: NodeJS.Timeout;

        const fetchInitialHistory = async () => {
            // Ambil 360 data TERBARU dengan descending, lalu reverse untuk urutan kronologis
            const { data, error } = await supabase
                .from('live_history')
                .select('time, viewers_count, created_at')
                .eq('youtube_video_id', videoId)
                .order('created_at', { ascending: false })
                .limit(360);

            if (data && isMounted) {
                // Reverse agar urutan waktu dari lama ke baru (jam 12 -> jam 1)
                const formattedHistory = data.reverse().map((item: { time: string; viewers_count: number; created_at: string }) => ({
                    time: item.time,
                    count: item.viewers_count,
                    createdAt: new Date(item.created_at).getTime(),
                }));
                setHistory(formattedHistory);
            }
        };

        fetchInitialHistory();

        const fetchViewers = async () => {
            try {
                const response = await ytService.fetchWithRetry((key) =>
                    `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${key}` 
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch from YouTube API');
                }

                const data = await response.json();

                if (isMounted) {
                    if (!data.items || data.items.length === 0 || !data.items[0].liveStreamingDetails) {
                        setViewersCount(0);
                        setIsLive(false);
                    } else {
                        const liveStreamingDetails = data.items[0].liveStreamingDetails;
                        const viewers = liveStreamingDetails.concurrentViewers
                            ? parseInt(liveStreamingDetails.concurrentViewers, 10)
                            : 0;
                        setViewersCount(viewers);
                        setIsLive(viewers > 0);

                        const nowDate = new Date();
                        const nowTime = nowDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const nowTimestamp = nowDate.getTime();

                        setHistory(prev => {
                            const lastPoint = prev[prev.length - 1];
                            const sameMinute =
                                !!lastPoint &&
                                Math.floor(lastPoint.createdAt / 60000) === Math.floor(nowTimestamp / 60000);

                            if (sameMinute) {
                                return prev;
                            }

                            const newHistory = [...prev, { time: nowTime, count: viewers, createdAt: nowTimestamp }].slice(-360);
                            
                            supabase.from('live_history').insert({
                                youtube_video_id: videoId,
                                time: nowTime,
                                viewers_count: viewers
                            }).then(({ error: insertError }: { error: Error | null }) => {
                                if (insertError) console.error("Gagal menyimpan ke Supabase:", insertError);
                            });

                            return newHistory;
                        });
                    }
                    setError(null);
                }
            } catch (err: any) {
                if (isMounted) {
                    console.error(err);
                    setError(err.message);
                }
            }
        };

        fetchViewers();

        pollInterval = setInterval(fetchViewers, 30000);

        return () => {
            isMounted = false;
            clearInterval(pollInterval);
        };
    }, [videoId, supabase]);

    return { viewersCount, isLive, error, history };
}
