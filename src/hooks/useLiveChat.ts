import { useState, useCallback, useRef } from 'react';

// Import hook-hook kecil dari folder chat
import { useVideoTimeSync } from './chat/useVideoTimeSync';
import { useSupabaseChat, ChatMessage } from './chat/useSupabaseChat';
import { useYouTubePolling } from './chat/useYouTubePolling';
import { useChatRenderer, useReplaySync } from './chat/useChatRenderer';
import { useSendMessage } from './chat/useSendMessage';

export function useLiveChat(videoId: string) {
    const [newMessage, setNewMessage] = useState('');

    // Refs untuk tracking
    const lastSeenMessageIds = useRef<Set<string>>(new Set());
    const isReplayRef = useRef(false);

    // 1. VIDEO TIME SYNC
    const { currentVideoTime, currentVideoTimeRef } = useVideoTimeSync(isReplayRef.current);

    // 2. SUPABASE CHAT INIT & REALTIME
    const handleNewMessageFromRealtime = useCallback((msg: ChatMessage) => {
        if (!isReplayRef.current) {
            messageQueue.current.push(msg);
        }
        lastSeenMessageIds.current.add(msg.id);
    }, []);

    const {
        liveChatId,
        isReplay,
        isLoading,
        chatHistory,
        lastSeenMessageIds: lastSeenFromSupabase
    } = useSupabaseChat(videoId, isReplayRef.current, handleNewMessageFromRealtime);

    if (isReplay !== isReplayRef.current) {
        isReplayRef.current = isReplay;
    }
    lastSeenMessageIds.current = lastSeenFromSupabase;

    // 3. YOUTUBE POLLING
    const handleYouTubeFallback = useCallback((messages: any[]) => {
        messages.forEach(msg => {
            if (!lastSeenMessageIds.current.has(msg.id)) {
                messageQueue.current.push(msg);
                lastSeenMessageIds.current.add(msg.id);
            }
        });
    }, []);

    const { isQuotaExceeded } = useYouTubePolling(
        liveChatId,
        isReplay,
        videoId,
        currentVideoTime,
        lastSeenMessageIds.current,
        handleYouTubeFallback
    );

    // 4. CHAT RENDERER - Dripping & Replay Sync
    const messageQueue = useRef<any[]>([]);

    const {
        visibleMessages,
        messageQueue: rendererQueue,
        handleVideoSeek: rendererHandleVideoSeek,
        addToVisibleMessages
    } = useChatRenderer(isReplay, currentVideoTime);

    messageQueue.current = rendererQueue.current as any;

    // 5. REPLAY SYNC
    const handleReplayMessages = useCallback((messages: any[], _lastIndex: number) => {
        addToVisibleMessages(messages);
    }, [addToVisibleMessages]);

    useReplaySync(
        isReplay,
        currentVideoTime,
        chatHistory as any,
        handleReplayMessages
    );

    // 6. SEND MESSAGE
    const handleSendSuccess = useCallback(() => {
        setNewMessage('');
    }, []);

    const {
        isSending,
        handleSendMessage: sendMessageHandler
    } = useSendMessage(videoId, liveChatId, currentVideoTime, handleSendSuccess);

    const handleSendMessage = useCallback(async (e: React.FormEvent) => {
        await sendMessageHandler(e, newMessage);
    }, [sendMessageHandler, newMessage]);

    // RETURN VALUE - Kompatibel dengan LiveChat.tsx
    const displayMessages = visibleMessages;

    return {
        liveChatId,
        messages: displayMessages,
        newMessage,
        setNewMessage,
        isSending,
        isReplay,
        isLoading,
        isQuotaExceeded,
        handleSendMessage,
        currentVideoTime: currentVideoTimeRef.current
    };
}
