import { GeminiClient } from '../lib/gemini.js';
import { DomainRouting, ClientPersona } from './types.js';

export const routeDomain = async (gemini: GeminiClient, jobDescription: string, persona: ClientPersona): Promise<DomainRouting> => {
    const prompt = `You are a Senior Architect acting as a Router.
    Route this Upwork job to the best domain expert.
    
    Client Persona: ${JSON.stringify(persona)}
    Job Description: "${jobDescription}"
    
    Available Domains: "Fullstack", "GenAI", "AI_ML", "DevOps".
    
    Return ONLY a JSON object:
    {
        "primaryDomain": "Fullstack" | "GenAI" | "AI_ML" | "DevOps",
        "secondaryDomains": string[],
        "confidence": number (0-1)
    }`;

    try {
        const result = await gemini.generateContent(prompt, { responseMimeType: 'application/json' });
        return JSON.parse(result);
    } catch (e) {
        console.error('Router Failed', e);
        return { primaryDomain: 'Fullstack', secondaryDomains: [], confidence: 0.5 };
    }
};
