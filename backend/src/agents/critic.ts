import { GeminiClient } from '../lib/gemini.js';

export const refineProposal = async (gemini: GeminiClient, originalProposal: string, jobDescription: string): Promise<string> => {
    const prompt = `You are a Senior Copy Editor and Upwork Expert.
    Refine the following proposal to make it more professional, persuasive, and concise.
    
    JOB DESCRIPTION:
    "${jobDescription}"
    
    ORIGINAL PROPOSAL:
    "${originalProposal}"
    
    RULES:
    - Keep it under 400 words.
    - Strengthen the "hook" (the first sentence).
    - Remove any "desperate" sounding language.
    - Ensure logical flow and clear call-to-action.
    - Maintain the expert tone set in the original.
    
    Return ONLY the refined proposal text in Markdown.`;

    try {
        return await gemini.generateContent(prompt);
    } catch (e) {
        console.error('Critic Refinement Failed', e);
        return originalProposal; // Fallback to original
    }
};
