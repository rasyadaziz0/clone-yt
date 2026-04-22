'use client';

import { useRef, useCallback, useEffect } from 'react';

interface UsePlayerSyncParams {
  playerRef: React.MutableRefObject<any>;
  videoId: string;
  isPlayerReady: boolean;
  isLive: boolean;
  availableQualities: string[];
  onPlayerReadyRef: React.MutableRefObject<((event: any) => void) | null>;
  onPlayerStateChangeRef: React.MutableRefObject<((event: any) => void) | null>;
  onPlaybackQualityChangeRef: React.MutableRefObject<((event: any) => void) | null>;
  checkIsLive: (player: any) => boolean;
  refreshQualities: () => void;
  setIsPlaying: (value: boolean) => void;
  setIsMuted: (value: boolean) => void;
  setVolume: (value: number) => void;
  setCurrentTime: (value: number) => void;
  setDuration: (value: number) => void;
  setCurrentQuality: (value: string) => void;
  setIsLiveSynced: (value: boolean) => void;
}

interface UsePlayerSyncReturn {
  handleSyncLive: () => void;
  formatQualityLabel: (q: string) => string;
}

export function usePlayerSync({
  playerRef,
  videoId,
  isLive,
  availableQualities,
  onPlayerReadyRef,
  onPlayerStateChangeRef,
  onPlaybackQualityChangeRef,
  checkIsLive,
  refreshQualities,
  setIsPlaying,
  setIsMuted,
  setVolume,
  setCurrentTime,
  setDuration,
  setCurrentQuality,
  setIsLiveSynced,
}: UsePlayerSyncParams): UsePlayerSyncReturn {
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update progress
  const updateProgress = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      const time = playerRef.current.getCurrentTime();
      setCurrentTime(time);
      setDuration(playerRef.current.getDuration());
      if (availableQualities.length === 0) refreshQualities();
      
      // PANCARKAN EVENT videoTimeUpdate UNTUK SINKRONISASI CHAT (SSOT)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('videoTimeUpdate', {
            detail: { currentTime: time }
          })
        );
      }
    }
  }, [availableQualities.length, refreshQualities, setCurrentTime, setDuration, playerRef]);

  // Player ready handler
  onPlayerReadyRef.current = useCallback((event: any) => {
    setVolume(event.target.getVolume());
    setIsMuted(event.target.isMuted());
    updateProgress();

    const savedTimeRaw = localStorage.getItem(`yt_progress_${videoId}`);
    const savedTime = savedTimeRaw ? parseFloat(savedTimeRaw) : NaN;
    if (!Number.isFinite(savedTime) || savedTime <= 0) return;

    // Delay restore so live metadata has time to settle; avoid seeking old VOD position on live streams.
    setTimeout(() => {
      if (checkIsLive(event.target)) return;
      const totalDuration = typeof event.target.getDuration === 'function' ? event.target.getDuration() : 0;
      if (totalDuration <= 0) return;
      event.target.seekTo(Math.min(savedTime, Math.max(totalDuration - 2, 0)), true);
    }, 400);
  }, [videoId, updateProgress, checkIsLive, setVolume, setIsMuted]);

  // Player state change handler
  onPlayerStateChangeRef.current = useCallback((event: any) => {
    const YT = (window as any).YT;
    if (event.data === YT.PlayerState.PLAYING) {
      setIsPlaying(true);
      if (!progressIntervalRef.current) progressIntervalRef.current = setInterval(updateProgress, 250);
    } else {
      setIsPlaying(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  }, [updateProgress, setIsPlaying]);

  // Playback quality change handler
  onPlaybackQualityChangeRef.current = useCallback((event: any) => {
    setCurrentQuality(event.data);
  }, [setCurrentQuality]);

  // Sync to live edge
  const handleSyncLive = useCallback(() => {
    if (playerRef.current && isLive) {
      const toLiveEdge = () => {
        const liveEdge = typeof playerRef.current.getDuration === 'function' ? playerRef.current.getDuration() : 0;
        if (liveEdge > 0) {
          const targetTime = Math.max(liveEdge - 0.1, 0);
          playerRef.current.seekTo(targetTime, true);
          setCurrentTime(targetTime);
          setDuration(liveEdge);
        }
      };

      toLiveEdge();
      if (typeof playerRef.current.playVideo === 'function') {
        playerRef.current.playVideo();
      }
      setIsPlaying(true);
      setIsLiveSynced(true);

      // Retry once after buffering so seek lands on newest live edge.
      setTimeout(() => {
        if (!playerRef.current || !isLive) return;
        toLiveEdge();
        if (typeof playerRef.current.getCurrentTime === 'function') {
          setCurrentTime(playerRef.current.getCurrentTime());
        }
      }, 350);
    }
  }, [isLive, playerRef, setIsLiveSynced, setIsPlaying, setCurrentTime, setDuration]);

  // Format quality label
  const formatQualityLabel = useCallback((q: string) => {
    const mapping: Record<string, string> = {
      'hd2160': '2160',
      'hd1440': '1440',
      'hd1080': '1080',
      'hd720': '720',
      'large': '480',
      'medium': '360',
      'small': '240',
      'tiny': '144',
      'auto': 'Auto',
    };
    return mapping[q] || q.replace('hd', '').toUpperCase();
  }, []);

  // Sync progress to localStorage
  useEffect(() => {
    const currentTime = playerRef.current?.getCurrentTime?.() ?? 0;
    if (currentTime > 5 && !isLive) {
      localStorage.setItem(`yt_progress_${videoId}`, currentTime.toString());
    }
  }, [videoId, isLive, playerRef]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  return {
    handleSyncLive,
    formatQualityLabel,
  };
}
