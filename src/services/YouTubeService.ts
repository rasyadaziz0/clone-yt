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

        if (response.status === 429) {
            throw new Error("All YouTube API Keys have exceeded their quota!");
        }

        return response;
    }

    // Mengambil Live Chat ID
    async getLiveChatId(videoId: string): Promise<{ liveChatId: string | null, isReplay: boolean }> {
        const res = await this.fetchWithRetry((key) => `${this.baseUrl}/videos?part=liveStreamingDetails&id=${videoId}&key=${key}`);
        if (!res.ok) throw new Error("Failed to fetch video details");

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
        if (!res.ok) throw new Error("Failed to fetch messages");

        const data = await res.json();
        return data.items || [];
    }

    // Mengirim Pesan Chat
    async sendMessage(liveChatId: string, messageText: string, accessToken: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/liveChat/messages?part=snippet`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                snippet: {
                    liveChatId: liveChatId,
                    type: 'textMessageEvent',
                    textMessageDetails: { messageText },
                },
            }),
        });

        if (!response.ok) {
            let parsedBody: any = null;
            let rawBody = '';

            try {
                rawBody = await response.text();
                parsedBody = rawBody ? JSON.parse(rawBody) : null;
            } catch {
                parsedBody = null;
            }

            const errorMessage =
                parsedBody?.error?.message ||
                (rawBody && rawBody.trim().length > 0 ? rawBody : null) ||
                `HTTP ${response.status} ${response.statusText}`;

            console.error("Detail Error YouTube API:", {
                status: response.status,
                statusText: response.statusText,
                url: `${this.baseUrl}/liveChat/messages?part=snippet`,
                body: parsedBody ?? rawBody ?? '(empty body)'
            });

            throw new Error(`Gagal mengirim pesan ke YouTube: ${errorMessage}`);
        }
    }
}

// Export single instance (Singleton pattern)
export const ytService = new YouTubeService();
