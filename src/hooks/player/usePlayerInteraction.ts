'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UsePlayerInteractionParams {
  isPlaying: boolean;
  handleTogglePlay: () => void;
  playerRef: React.MutableRefObject<any>;
}

export function usePlayerInteraction({
  handleTogglePlay,
  playerRef,
}: UsePlayerInteractionParams) {
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const coarsePointerMediaQueryRef = useRef<MediaQueryList | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isTouch, setIsTouch] = useState(false);

  const isVideoPlaying = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.getPlayerState === 'function') {
      return playerRef.current.getPlayerState() === 1;
    }
    return false;
  }, [playerRef]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    
    inactivityTimeoutRef.current = setTimeout(() => { 
      if (isVideoPlaying()) setShowControls(false); 
    }, 2500);
  }, [isVideoPlaying]);

  const handleMouseLeave = useCallback(() => {
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    if (isVideoPlaying()) setShowControls(false);
  }, [isVideoPlaying]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // Cegah event bubbling
    e.stopPropagation();

    if (isTouch) {
      // Mobile behavior (seperti YouTube): tap video untuk toggle visibility controls,
      // play/pause dilakukan lewat tombol kontrol agar tidak terlalu sensitif.
      setShowControls((prev) => {
        const nextVisible = !prev;
        if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);

        if (nextVisible) {
          inactivityTimeoutRef.current = setTimeout(() => {
            if (playerRef.current?.getPlayerState() === 1) setShowControls(false);
          }, 2500);
        }

        return nextVisible;
      });
      return;
    }

    handleTogglePlay();

    setShowControls(true);
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    inactivityTimeoutRef.current = setTimeout(() => {
      if (playerRef.current?.getPlayerState() === 1) setShowControls(false);
    }, 2500);
  }, [handleTogglePlay, isTouch, playerRef]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!playerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width / 2) {
      playerRef.current.seekTo(playerRef.current.getCurrentTime() - 10, true);
    } else {
      playerRef.current.seekTo(playerRef.current.getCurrentTime() + 10, true);
    }
  }, [playerRef]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const detectTouch = () => {
      const hasTouch =
        'ontouchstart' in window ||
        (navigator.maxTouchPoints ?? 0) > 0 ||
        Boolean(coarsePointerMediaQueryRef.current?.matches);
      setIsTouch(hasTouch);
    };

    coarsePointerMediaQueryRef.current = window.matchMedia('(pointer: coarse)');
    detectTouch();

    const mediaQuery = coarsePointerMediaQueryRef.current;
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', detectTouch);
    } else {
      mediaQuery.addListener(detectTouch);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', detectTouch);
      } else {
        mediaQuery.removeListener(detectTouch);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    };
  }, []);

  return {
    showControls,
    isTouch,
    handleMouseMove,
    handleMouseLeave,
    handleContainerClick,
    handleDoubleClick,
  };
}
