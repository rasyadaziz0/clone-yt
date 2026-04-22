'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, Eye, Check, Bell, Youtube, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useYoutubeViewers } from '@/hooks/useYoutubeViewers';
import { useSupabase } from '@/supabase';
import { LiveAnalyticsChart } from './LiveAnalyticsChart';
import DOMPurify from 'dompurify';
import { ytService } from '@/services/YouTubeService';

// Helper function to convert URLs in text to clickable links
const linkifyText = (text: string): string => {
  if (!text) return '';
  
  // Regex to match URLs (http, https, www)
  const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g;
  
  return text.replace(urlRegex, (url) => {
    const href = url.startsWith('http') ? url : `https://${url}`;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline break-all">${url}</a>`;
  });
};

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface VideoInfoProps {
    videoId: string;
}

export default function VideoInfo({ videoId }: VideoInfoProps) {
    const [videoData, setVideoData] = useState<any>(null);
    const [channelAvatar, setChannelAvatar] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeframe, setTimeframe] = useState<string>('30m');
    const { auth } = useSupabase();
    const { history } = useYoutubeViewers(videoId);

    const getFilteredHistory = () => {
        if (!history || history.length === 0) return [];
        let timeframeMs = 30 * 60 * 1000;
        switch (timeframe) {
            case '1m': timeframeMs = 1 * 60 * 1000; break;
            case '3m': timeframeMs = 3 * 60 * 1000; break;
            case '5m': timeframeMs = 5 * 60 * 1000; break;
            case '15m': timeframeMs = 15 * 60 * 1000; break;
            case '30m': timeframeMs = 30 * 60 * 1000; break;
            case '1h': timeframeMs = 60 * 60 * 1000; break;
            case '2h': timeframeMs = 2 * 60 * 60 * 1000; break;
            case '3h': timeframeMs = 3 * 60 * 60 * 1000; break;
            default: timeframeMs = 30 * 60 * 1000;
        }

        const latestTimestamp = history[history.length - 1]?.createdAt ?? Date.now();
        const earliestTimestamp = latestTimestamp - timeframeMs;

        return history.filter((point: { createdAt?: number }) => {
            if (typeof point.createdAt !== 'number') return true;
            return point.createdAt >= earliestTimestamp;
        });
    };

    useEffect(() => {
        const fetchVideoDetails = async () => {
            try {
                const res = await ytService.fetchWithRetry((key) =>
                    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,liveStreamingDetails&id=${videoId}&key=${key}`
                );
                const data = await res.json();

                if (data.items && data.items.length > 0) {
                    const videoDetails = data.items[0];
                    setVideoData(videoDetails);

                    // Fetch Profile Avatar of the Channel
                    if (videoDetails.snippet?.channelId) {
                        try {
                            const channelRes = await ytService.fetchWithRetry((key) =>
                                `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${videoDetails.snippet.channelId}&key=${key}`
                            );
                            const channelData = await channelRes.json();
                            if (channelData.items && channelData.items.length > 0) {
                                const avatarUrl = channelData.items[0].snippet?.thumbnails?.default?.url;
                                if (avatarUrl) {
                                    setChannelAvatar(avatarUrl);
                                }
                            }
                        } catch (avatarError) {
                            console.error("Error fetching channel avatar:", avatarError);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching video info:", error);
            } finally {
                setLoading(false);
            }
        };

        if (videoId) fetchVideoDetails();
    }, [videoId]);

    useEffect(() => {
        const fetchSubscriptionStatus = async () => {
            if (!videoData?.snippet?.channelId) return;
            
            // Get fresh token from session
            const { data: sessionData } = await auth.getSession();
            const providerToken = sessionData.session?.provider_token;
            const localToken = localStorage.getItem('google_access_token');
            
            console.log('Debug - provider_token:', providerToken ? 'exists' : 'null');
            console.log('Debug - localStorage token:', localToken ? 'exists' : 'null');
            
            let accessToken = providerToken || localToken;
            
            if (!accessToken) {
                console.log('Debug: No access token available');
                return;
            }

            try {
                const res = await fetch(
                    `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&forChannelId=${videoData.snippet.channelId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                );
                
                // Handle 401 - token expired
                if (res.status === 401) {
                    localStorage.removeItem('google_access_token');
                    toast.error("Silakan login ulang untuk mengakses fitur YouTube.");
                    return;
                }
                
                const data = await res.json();
                if (data.items && data.items.length > 0) {
                    setIsSubscribed(true);
                    setSubscriptionId(data.items[0].id);
                }
            } catch (error) {
                console.error("Error fetching subscription status:", error);
            }
        };

        fetchSubscriptionStatus();
    }, [videoData, auth]);

    const handleSubscribeToggle = async () => {
        // Get fresh token from session
        const { data: sessionData } = await auth.getSession();
        let accessToken = sessionData.session?.provider_token || localStorage.getItem('google_access_token');
        
        if (!accessToken) {
            toast.error("Kamu harus login untuk melakukan subscribe.");
            return;
        }

        if (!videoData?.snippet?.channelId) return;

        setIsSubmitting(true);
        try {
            if (isSubscribed && subscriptionId) {
                const res = await fetch(
                    `https://www.googleapis.com/youtube/v3/subscriptions?id=${subscriptionId}`,
                    {
                        method: 'DELETE',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                );

                if (res.ok || res.status === 204) {
                    setIsSubscribed(false);
                    setSubscriptionId(null);
                } else if (res.status === 401) {
                    localStorage.removeItem('google_access_token');
                    throw new Error("Sesi berakhir, silakan login ulang.");
                } else {
                    throw new Error("Gagal unsubscribe");
                }
            } else {
                const res = await fetch(
                    `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            snippet: {
                                resourceId: {
                                    kind: "youtube#channel",
                                    channelId: videoData.snippet.channelId
                                }
                            }
                        })
                    }
                );

                const data = await res.json();
                if (res.ok && data.id) {
                    setIsSubscribed(true);
                    setSubscriptionId(data.id);
                } else if (res.status === 401) {
                    localStorage.removeItem('google_access_token');
                    throw new Error("Sesi berakhir, silakan login ulang.");
                } else {
                    throw new Error(data.error?.message || "Gagal subscribe");
                }
            }
        } catch (error) {
            console.error("Error toggling subscription:", error);
            toast.error("Gagal memproses permintaan subscribe.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="h-24 sm:h-28 animate-pulse bg-white/[0.02] rounded-xl sm:rounded-2xl mt-3 sm:mt-5 w-full border border-white/[0.03]" />;
    if (!videoData) return null;

    const { snippet, statistics, liveStreamingDetails } = videoData;
    const isStreamingNow =
        snippet?.liveBroadcastContent === 'live' || !!liveStreamingDetails?.concurrentViewers;

    const formatNumber = (num: string) => {
        return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(Number(num));
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-3 sm:mt-4 p-3 sm:p-4 md:p-5 lg:p-6 rounded-xl border border-border bg-card flex flex-col gap-3 sm:gap-4"
        >
            {isStreamingNow && (
                <div className="flex items-center gap-2 text-red-500">
                    <Youtube className="h-4 w-4" />
                    <span className="text-[11px] uppercase tracking-wider font-semibold">Now Streaming</span>
                </div>
            )}
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-foreground tracking-tight leading-tight">
                {snippet.title}
            </h1>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-5">
                <div className="flex items-center gap-3 sm:gap-4">
                    {channelAvatar ? (
                        <img
                            src={channelAvatar}
                            alt={snippet.channelTitle}
                            className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full object-cover border border-border"
                        />
                    ) : (
                        <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-base sm:text-lg md:text-xl">
                            {snippet.channelTitle.charAt(0)}
                        </div>
                    )}
                    <div className="flex flex-col">
                        <span className="font-semibold text-foreground text-xs sm:text-sm md:text-base">{snippet.channelTitle}</span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Channel</span>
                    </div>

                    <Button
                        variant={isSubscribed ? "outline" : "default"}
                        size="sm"
                        onClick={handleSubscribeToggle}
                        disabled={isSubmitting || loading}
                        className={`rounded-full px-4 sm:px-5 md:px-6 h-8 sm:h-9 md:h-10 font-semibold text-[10px] sm:text-xs transition-all duration-300 ${
                            isSubscribed 
                                ? "bg-muted hover:bg-muted/80 text-foreground border-border" 
                                : "bg-red-600 hover:bg-red-700 text-white border-0"
                        }`}
                    >
                        {isSubscribed ? (
                            <>
                                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                Subscribed
                            </>
                        ) : (
                            <>
                                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                Subscribe
                            </>
                        )}
                    </Button>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-background rounded-xl text-[10px] sm:text-xs font-medium border border-border">
                        <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                        <span className="text-foreground">{formatNumber(statistics.likeCount || 0)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-background rounded-xl text-[10px] sm:text-xs font-medium border border-border">
                        <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                        <span className="text-foreground">{formatNumber(statistics.viewCount || 0)}</span>
                    </div>
                </div>
            </div>

            {/* Safe Description Render with clickable links */}
            {snippet.description && (
                <div 
                    className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap overflow-hidden p-3 sm:p-4 md:p-5 bg-background rounded-xl border border-border max-h-32 sm:max-h-40 md:max-h-44 overflow-y-auto leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                        __html: DOMPurify.sanitize(linkifyText(snippet.description), {
                            ALLOWED_TAGS: ['a', 'br', 'p', 'strong', 'em', 'span'],
                            ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
                        }) 
                    }}
                />
            )}

            {/* Live Analytics Section */}
            {history && history.length > 0 && (
                <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 md:pt-6 border-t border-border">
                    <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-5">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="relative">
                                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full animate-pulse" />
                            </div>
                            <h3 className="text-xs sm:text-sm font-semibold text-foreground">Live Analytics</h3>
                        </div>
                        <Select value={timeframe} onValueChange={setTimeframe}>
                            <SelectTrigger className="w-[100px] sm:w-[115px] md:w-[130px] h-8 sm:h-9 text-[10px] sm:text-xs bg-background border-border rounded-lg sm:rounded-xl text-foreground hover:bg-muted transition-all">
                                <SelectValue placeholder="Timeframe" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border rounded-xl">
                                <SelectItem value="1m" className="rounded-lg">1 Menit</SelectItem>
                                <SelectItem value="3m" className="rounded-lg">3 Menit</SelectItem>
                                <SelectItem value="5m" className="rounded-lg">5 Menit</SelectItem>
                                <SelectItem value="15m" className="rounded-lg">15 Menit</SelectItem>
                                <SelectItem value="30m" className="rounded-lg">30 Menit</SelectItem>
                                <SelectItem value="1h" className="rounded-lg">1 Jam</SelectItem>
                                <SelectItem value="2h" className="rounded-lg">2 Jam</SelectItem>
                                <SelectItem value="3h" className="rounded-lg">3 Jam</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="bg-background w-full h-[150px] sm:h-[180px] md:h-[200px] lg:h-[240px] border border-border rounded-xl overflow-hidden pt-2 sm:pt-3 pl-2 sm:pl-3 relative">
                        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-card rounded-md sm:rounded-lg border border-border">
                            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Live</span>
                        </div>
                        <LiveAnalyticsChart data={getFilteredHistory()} />
                    </div>
                </div>
            )}
        </motion.div>
    );
}
