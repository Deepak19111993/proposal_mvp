import { GeminiClient } from '../src/lib/gemini';

async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY is missing");
        process.exit(1);
    }

    try {
        console.log("Listing models...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        const models = (data as any).models || [];
        console.log("Available embedding models:", models.filter((m: any) => m.name.includes("embedding")).map((m: any) => m.name));

        const gemini = new GeminiClient(apiKey);
        console.log("Testing embedding generation with text-embedding-004...");
        const embedding = await gemini.generateEmbedding("Hello world");
        console.log("Embedding generated successfully. Length:", embedding.length);
    } catch (e: any) {
        console.error("Gemini API Error:", e.message || e);
    }
}

main();
