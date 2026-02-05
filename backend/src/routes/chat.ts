import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { resumes as resumesTable, history } from '../db/schema'
import { Bindings, Variables } from '../types'


const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

app.post('/', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json()
    let question = body.question as string

    const apiKey = c.env.GEMINI_API_KEY
    const db = drizzle(c.env.MY_DB);

    if (!question) {
        return c.json({ error: 'Question is required' }, 400)
    }



    let answer = "No answer found or error occurred.";
    let fitscore = 0;

    const { or, desc } = await import('drizzle-orm')
    const { users } = await import('../db/schema')

    try {
        // 1. Fetch user's resumes AND Admin resumes for context
        const resumes = await db.select({
            id: resumesTable.id,
            role: resumesTable.role,
            content: resumesTable.content,
            userId: resumesTable.userId
        })
            .from(resumesTable)
            .leftJoin(users, eq(resumesTable.userId, users.id))
            .where(
                or(
                    eq(resumesTable.userId, userId),
                    eq(users.role, 'SUPER_ADMIN')
                )
            )
            .all();

        // 1. Hard check: If no resumes at all, reject immediately
        if (resumes.length === 0) {
            return c.json({
                id: crypto.randomUUID(),
                question,
                answer: "### ❌ No Resumes Found\nYou haven't generated any resumes yet. Please visit the **Resume Generator** to create a professional profile (e.g., SEO Specialist) before generating a proposal.",
                fitscore: 0,
                timestamp: new Date().toISOString(),
                userId
            });
        }

        // 2. Format resumes for prompt
        const resumesContext = resumes.map((r: any) => `ROLE: ${r.role}\nCONTENT: ${r.content}`).join('\n\n---\n\n');

        const systemPrompt = `You are an ELITE Recruitment Specialist and Proposal Architect.
        Your ABSOLUTE PRIORITY is to verify if requested Job Requirements match the User's Professional Background (Resumes).
        
        ### USER'S RESUMES:
        ${resumesContext}
        
        ### TARGET JOB REQUIREMENTS:
        ${question}
        
        ### EVALUATION PROTOCOL:
        1. **ELIGIBILITY CHECK**: Verify if the provided resumes contain skills or experience relevant to the "TARGET JOB REQUIREMENTS". 
           - **Transferable Skills**: Look for keyword matches (e.g., if Job asks for "SEO" and Resume mentions "Optimization", "Ranking", or "Content Strategy", count it as a match).
           - **Role Overlap**: A "WordPress Developer" is often a valid match for "Web Developer" or "SEO" roles if the content supports it.
           - Only trigger a REJECTION if the resume is **COMPLETELY UNRELATED** (e.g., seeking a Medical Doctor but user is a Graphic Designer).

        2. **IF REJECTED (No valid match)**:
           - Set "fitscore" to 0.
           - Set "proposal" to: "### ❌ Mismatched Background\nYour current professional profiles (**${resumes.map(r => r.role).join(', ')}**) do not appear to contain the necessary skills for this role. I checked for relevant keywords but couldn't find a strong enough link.\n\n**Recommendation**: Please create a resume that explicitly highlights these skills."
           - Set "requirementMatrix" and "clarifyingQuestions" to empty strings.

        3. **IF ELIGIBLE MATCH**:
           - Set "fitscore" (1-100).
           - "proposal": A professional intro/narrative (max 400 words). Do NOT include internal IDs or placeholders. Focus on the value proposition.
           - "requirementMatrix": A point-wise Markdown list showing how your skills match requirements. Each point should look like: "- [Requirement Name]: [Matching Skill/Experience from your Resume Role]". Do NOT include IDs.
           - "clarifyingQuestions": Max 3 strategic questions for the client.

        Output MUST be a valid JSON object with keys: fitscore, proposal, requirementMatrix, clarifyingQuestions.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: {
                    response_mime_type: "application/json"
                }
            })
        })

        const data = await response.json() as any;

        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            const rawText = data.candidates[0].content.parts[0].text;

            try {
                const parsed = JSON.parse(rawText);
                fitscore = typeof parsed.fitscore === 'number' ? parsed.fitscore : 0;

                let chunks = [];
                if (parsed.proposal) chunks.push(parsed.proposal);

                const matrix = parsed.requirementMatrix;
                if (matrix && (typeof matrix === 'string' && matrix.trim() || Array.isArray(matrix))) {
                    chunks.push('## Requirement Matrix\n' + (Array.isArray(matrix) ? matrix.join('\n') : matrix));
                }

                const questions = parsed.clarifyingQuestions;
                if (questions && (typeof questions === 'string' && questions.trim() || Array.isArray(questions))) {
                    chunks.push('## Clarifying Questions\n' + (Array.isArray(questions) ? questions.map((q: string) => `- ${q}`).join('\n') : questions));
                }

                answer = chunks.join('\n\n');
            } catch (e) {
                console.error("Failed to parse JSON response:", rawText);
                answer = rawText;
            }
        } else if (data.error) {
            answer = `API Error: ${data.error.message}`;
        }
    } catch (e: any) {
        answer = `Application Error: ${e.message}`;
    }

    // Save to history scoped by userId
    const id = crypto.randomUUID();
    const historyItem = { id, question, answer, fitscore, userId };

    try {
        await db.insert(history).values(historyItem);
    } catch (e) {
        console.error("Failed to save history", e);
    }

    return c.json({ ...historyItem, timestamp: new Date().toISOString() })
})

export default app
