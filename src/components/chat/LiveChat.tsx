'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageSquare, ExternalLink, Send, User as UserIcon, MessageSquareOff, ArrowDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import AuthButton from '@/components/auth/AuthButton';
import { User } from '@supabase/supabase-js';
import { useLiveChat } from '@/hooks/useLiveChat';
import { ytService } from '@/services/YouTubeService';
import ChatMessageItem from './ChatMessageItem';

interface LiveChatProps {
  videoId: string;
  theme: 'dark' | 'light';
  hostname: string;
  user: User | null;
  isFullscreen?: boolean;
  onClose?: () => void;
}

export default function LiveChat({ videoId, hostname, user, isFullscreen, onClose }: LiveChatProps) {
  const SCROLL_BOTTOM_THRESHOLD = 80;
  const {
    liveChatId,
    messages,
    newMessage,
    setNewMessage,
    isSending,
    isReplay,
    isLoading,
    isQuotaExceeded,
    handleSendMessage
  } = useLiveChat(videoId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const hasApiKey = ytService.getKey() !== '';
  const shouldShowYouTubeFallback = isQuotaExceeded && !!videoId && !!hostname;
  const fallbackChatUrl = `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${hostname}&dark_theme=1`;

  const isNearBottom = (el: HTMLDivElement) => {
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom <= SCROLL_BOTTOM_THRESHOLD;
  };

  const handleChatScroll = () => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;
    const nearBottom = isNearBottom(scrollElement);
    shouldAutoScrollRef.current = nearBottom;
    setShowJumpToLatest(!nearBottom);
  };

  const scrollToLatest = () => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;
    shouldAutoScrollRef.current = true;
    setShowJumpToLatest(false);
    scrollElement.scrollTo({
      top: scrollElement.scrollHeight,
      behavior: 'auto'
    });
  };

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement || !shouldAutoScrollRef.current) return;

    scrollElement.scrollTo({
      top: scrollElement.scrollHeight,
      behavior: 'auto'
    });
    setShowJumpToLatest(false);
  }, [messages]);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    scrollElement.scrollTo({
      top: scrollElement.scrollHeight,
      behavior: 'auto',
    });
    shouldAutoScrollRef.current = true;
    setShowJumpToLatest(false);
  }, [videoId]);

  return (
    <div className={`legacy-live-chat-anim flex flex-col flex-none transition-all relative z-10 overflow-hidden ${isFullscreen
      ? 'w-full h-[40vh] min-h-[200px] landscape:h-full landscape:min-h-0 border-t border-white/10 landscape:border-t-0 landscape:border-l landscape:border-l-white/10 rounded-none'
      : 'w-full h-full border border-white/10 bg-[#0b0b0b] rounded-t-3xl rounded-b-none sm:rounded-xl sm:border-border sm:bg-card'
      }`}>
      <div className={`px-3 sm:px-3 py-2.5 sm:py-2.5 flex items-center border-b shrink-0 ${isFullscreen ? 'border-white/10 bg-black/30' : 'border-white/10 sm:border-border bg-black/40 sm:bg-card'}`}>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <MessageSquare className={`text-red-500 ${isFullscreen ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
          <span className={`font-bold text-foreground ${isFullscreen ? 'text-[10px] uppercase tracking-widest' : 'text-xs sm:text-xs sm:uppercase sm:tracking-widest'}`}>
            <span className="sm:hidden inline-flex items-center gap-1">Live chat</span>
            <span className="hidden sm:inline">Live Chat</span>
          </span>
        </div>
        {!isFullscreen && (
          <button
            type="button"
            onClick={onClose}
            disabled={!onClose}
            className="sm:hidden inline-flex h-7 w-7 items-center justify-center rounded-full text-foreground/60 transition-colors hover:text-foreground active:text-foreground"
            aria-label="Close chat panel"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {videoId && (
          <a
            href={`https://www.youtube.com/live_chat?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-border/50 bg-background/90 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm transition-all hover:border-red-500/40 hover:text-red-500 hover:shadow-md sm:px-3 sm:text-xs"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            Live Chat
            <ExternalLink className="hidden h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 sm:inline-flex" />
          </a>
        )}
      </div>

      <div className="relative flex-grow min-h-0">
        {shouldShowYouTubeFallback ? (
          <iframe
            title="YouTube Live Chat Fallback"
            src={fallbackChatUrl}
            className="w-full h-full border-0 bg-black"
            allow="autoplay; encrypted-media"
          />
        ) : (
        <div
          ref={scrollRef}
          onScroll={handleChatScroll}
          className={`h-full overflow-y-auto overflow-x-hidden bg-[#0b0b0b] sm:bg-background ${isFullscreen ? 'p-2 pb-3 space-y-2' : 'px-2 py-1.5 pb-3 sm:p-3 md:p-4 sm:pb-5 md:pb-6 space-y-1 sm:space-y-3 md:space-y-4'}`}
        >
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground uppercase tracking-widest text-center">
              Memuat Obrolan...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-3 sm:space-y-4">
              <div className="bg-muted/10 p-3 sm:p-4 rounded-full">
                {isReplay && !liveChatId ? <MessageSquareOff className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/40" /> : <MessageSquare className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/40" />}
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xs sm:text-sm font-bold tracking-tight text-foreground">
                  {isReplay && !liveChatId ? "Belum Ada Riwayat Chat" : (hasApiKey ? "Chat Kosong" : "API Key Belum Diisi")}
                </h3>
                <p className="text-[11px] sm:text-[12px] leading-relaxed text-muted-foreground max-w-[200px] sm:max-w-[250px] mx-auto">
                  {isReplay && !liveChatId ? "Jadilah yang pertama meninggalkan pesan di siaran ulang ini!" : "Belum ada pesan masuk."}
                </p>
              </div>
            </div>
          ) : (
            messages.slice(-50).map((msg) => (
              <ChatMessageItem key={msg.id || msg.id} msg={msg} isFullscreen={isFullscreen} />
            ))
          )}
        </div>
        )}
        {showJumpToLatest && !shouldShowYouTubeFallback && (
          <Button
            type="button"
            size="sm"
            onClick={scrollToLatest}
            className="absolute right-3 bottom-3 h-8 rounded-full px-3 text-[10px] font-bold uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white shadow-lg"
          >
            <ArrowDown className="h-3.5 w-3.5 mr-1" />
            Terbaru
          </Button>
        )}
      </div>

      <div className={`border-t shrink-0 ${isFullscreen ? 'pt-2.5 px-4 pb-2 border-white/10 bg-black/40' : 'pt-3 px-2 pb-4 sm:pt-4 sm:px-3 sm:pb-6 border-border bg-card'}`}>
        {!user ? (
          <div className="flex flex-col items-center justify-center py-2 space-y-1.5 sm:space-y-2">
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-muted-foreground">Sign in to chat</p>
            <AuthButton />
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className={`flex items-center ${isFullscreen ? 'gap-1.5' : 'gap-1.5 sm:gap-2'}`}>
            <Avatar className={`flex-none ${isFullscreen ? 'h-6 w-6' : 'h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8'}`}>
              <AvatarImage src={user.user_metadata?.avatar_url || user.user_metadata?.picture || ''} />
              <AvatarFallback><UserIcon className={`${isFullscreen ? 'h-3 w-3' : 'h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4'}`} /></AvatarFallback>
            </Avatar>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Kirim pesan..."
              disabled={isSending}
              className={`flex-grow bg-background border border-border rounded-lg sm:rounded-full focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50 text-foreground ${isFullscreen ? 'px-3 py-1.5 text-xs' : 'px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs md:text-sm'}`}
            />
            <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()} className={`rounded-lg sm:rounded-full flex-none bg-red-600 hover:bg-red-700 text-white ${isFullscreen ? 'h-7 w-7' : 'h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9'}`}>
              <Send className={`${isFullscreen ? 'h-3 w-3' : 'h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4'}`} />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
