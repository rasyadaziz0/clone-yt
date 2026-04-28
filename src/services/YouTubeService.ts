export class YouTubeService {
    private baseUrl: string = 'https://www.googleapis.com/youtube/v3';

    public getKey(): string {
        // API key dikelola penuh di server-side proxy.
        return '__server_managed__';
    }

    public async fetchWithRetry(urlFactory: (key: string) => string, options?: RequestInit): Promise<Response> {
        const targetUrl = urlFactory('server-key');
        const response = await fetch(`/api/youtube/proxy?url=${encodeURIComponent(targetUrl)}`, {
            ...options,
            method: options?.method ?? 'GET',
        });

        if (response.status === 401) {
            throw new Error('YOUTUBE_PROXY_UNAUTHORIZED');
        }

        if (response.status === 429) {
            throw new Error('YOUTUBE_QUOTA_EXCEEDED');
        }

        if (!response.ok) {
            throw new Error(`YOUTUBE_PROXY_ERROR:${response.status}`);
        }

        return response;
    }

    // Mengambil Live Chat ID
    async getLiveChatId(videoId: string): Promise<{ liveChatId: string | null, isReplay: boolean }> {
        const res = await this.fetchWithRetry((key) => `${this.baseUrl}/videos?part=liveStreamingDetails&id=${videoId}&key=${key}`);
        // fetchWithRetry already throws on non-ok responses

        const data = await res.json();
        if (!data.items || data.items.length === 0) return { liveChatId: null, isReplay: false };

        const details = data.items[0].liveStreamingDetails;
        if (details && details.activeLiveChatId) {
            return { liveChatId: details.activeLiveChatId, isReplay: false };
        } else if (details) {
            return { liveChatId: null, isReplay: true };
        }

        return { liveChatId: null, isReplay: false };
    }

    // Mengambil Pesan Chat
    async getMessages(liveChatId: string): Promise<any[]> {
        const res = await this.fetchWithRetry((key) => `${this.baseUrl}/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${key}`);
        // fetchWithRetry already throws on non-ok responses

        const data = await res.json();
        return data.items || [];
    }

    // Note: sendMessage is handled server-side via /api/youtube/live-chat/send
    // (see useSendMessage.ts). Direct client-side YouTube write calls are intentionally
    // removed to keep OAuth tokens off the client.
}

// Export single instance (Singleton pattern)
export const ytService = new YouTubeService();
