import { GeminiClient } from '../lib/gemini.js';
import { RequirementsMatrix, ClientPersona } from './types.js';

export const analyzeRequirements = async (gemini: GeminiClient, jobDescription: string, persona: ClientPersona, domain: string): Promise<RequirementsMatrix> => {
    const prompt = `You are an Expert in ${domain}.
    Analyze this job from a ${domain} perspective.
    
    Client Persona: ${JSON.stringify(persona)}
    Job Description: "${jobDescription}"
    
    Extract requirements into a structured matrix.
    Return ONLY a JSON object:
    {
        "explicit": string[],
        "implied": string[],
        "constraints": string[],
        "ambiguities": string[],
        "risks": string[],
        "clarifyingQuestions": [{ "question": string, "type": "MUST_ASK" | "GOOD_TO_ASK" }]
    }`;

    try {
        const result = await gemini.generateContent(prompt, { responseMimeType: 'application/json' });
        return JSON.parse(result);
    } catch (e) {
        console.error(`Expert Analysis (${domain}) Failed`, e);
        return {
            explicit: [], implied: [], constraints: [], ambiguities: [], risks: [], clarifyingQuestions: []
        };
    }
};
