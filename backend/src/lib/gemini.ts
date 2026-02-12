export class GeminiClient {
    private apiKey: string;
    private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async generateEmbedding(text: string): Promise<number[]> {
        const response = await fetch(`${this.baseUrl}/gemini-embedding-001:embedContent?key=${this.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'models/gemini-embedding-001',
                content: { parts: [{ text }] }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to generate embedding: ${errorText}`);
        }

        const data = await response.json() as { embedding: { values: number[] } };
        return data.embedding.values;
    }

    async generateContent(prompt: string, config: any = {}): Promise<string> {
        const model = config.model || 'gemini-2.0-flash';
        console.log(`[Gemini] Using model: ${model}`);

        let body: any = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0,
                ...config.generationConfig
            }
        };

        // If JSON mode requested
        if (config.responseMimeType === 'application/json') {
            body.generationConfig = {
                ...body.generationConfig,
                responseMimeType: 'application/json'
            };
        }

        const response = await fetch(`${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to generate content: ${errorText} (Model: ${model})`);
        }

        const data = await response.json() as any;
        // Check for safety blocks or errors
        if (data.promptFeedback?.blockReason) {
            throw new Error(`Blocked: ${data.promptFeedback.blockReason}`);
        }

        return data.candidates[0].content.parts[0].text;
    }
}
