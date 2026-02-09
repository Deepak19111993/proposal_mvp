import { GeminiClient } from '../lib/gemini.js';
import { ClientPersona } from './types.js';

export const analyzePersona = async (gemini: GeminiClient, jobDescription: string): Promise<ClientPersona> => {
    const prompt = `You are an expert at analyzing Upwork client personas.
    Analyze the following job description and extract the client's persona.
    
    Job Description:
    "${jobDescription}"
    
    Return ONLY a JSON object with this structure:
    {
        "technicalLevel": "TECHNICAL" | "NON_TECHNICAL" | "MIXED",
        "tone": "CASUAL" | "PROFESSIONAL" | "URGENT" | "STRICT",
        "urgency": "LOW" | "MEDIUM" | "HIGH",
        "hasBudget": boolean,
        "ambiguityLevel": "LOW" | "MEDIUM" | "HIGH"
    }`;

    try {
        const result = await gemini.generateContent(prompt, { responseMimeType: 'application/json' });
        return JSON.parse(result);
    } catch (e) {
        console.error('Persona Analysis Failed', e);
        // Fallback
        return {
            technicalLevel: 'MIXED',
            tone: 'PROFESSIONAL',
            urgency: 'MEDIUM',
            hasBudget: false,
            ambiguityLevel: 'MEDIUM'
        };
    }
};
