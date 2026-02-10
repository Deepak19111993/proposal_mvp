import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq, desc, and, or } from 'drizzle-orm'
import { resumes as resumesTable, history, users } from '../db/schema.js'
import { Bindings, Variables } from '../types.js'


const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

app.post('/', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json()
    let question = body.question as string

    const apiKey = c.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY
    const model = c.env.GEMINI_MODEL || process.env.GEMINI_MODEL || "gemini-1.5-flash"; // Default to flash model if not specified, verify model name validity
    const dbUrl = c.env.DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) return c.json({ error: 'Database URL not configured' }, 500);
    const sql = neon(dbUrl);
    const db = drizzle(sql);

    if (!question) {
        return c.json({ error: 'Question is required' }, 400)
    }



    let answer = "No answer found or error occurred.";
    let fitscore = 0;

    // Dynamic imports removed
    // const { or, desc, and } = await import('drizzle-orm')
    // const { users } = await import('../db/schema')

    // Helper for Domain Validation
    async function validateDomain(userDomain: string, jobDescription: string, apiKey: string, model: string) {
        const prompt = `You are a strict domain validator for a recruitment platform.
       User Domain: ${userDomain}
       Job Description: ${jobDescription}
       Task: Determine if this Job Description is technically relevant to the User Domain.
       - Consider 'Fullstack' relevant to 'Frontend', 'Backend', 'Web', 'Software Engineer', 'MERN', 'React', 'Node'.
       - Consider 'GenAI' relevant to 'AI', 'ML', 'LLM', 'RAG', 'Python', 'Data Scientist'.
       - Consider 'DevOps' relevant to 'SRE', 'Platform', 'Infrastructure', 'Cloud', 'AWS', 'Docker', 'Kubernetes'.
       - If the User Domain is null or empty, return isMatch: true (permissive).
       Output JSON ONLY: { "isMatch": boolean, "jobDomain": string, "reason": string }`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { response_mime_type: "application/json" }
                })
            });
            const data = await response.json() as any;
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) return { isMatch: true, reason: "Validation failed, defaulting to match" }; // Fail open
            return JSON.parse(text);
        } catch (e) {
            console.error("Domain validation error", e);
            return { isMatch: true, reason: "Validation error" };
        }
    }

    try {
        // 1. Fetch user's resumes AND Admin resumes for context (Filtered by Domain)
        const userDomain = c.get('domain');
        // PROPOSAL: Implement Strict Domain Check
        if (userDomain) {
            if (!apiKey) {
                console.error("API Key missing for domain validation");
                // Skip validation or error out? Let's skip to avoid blocking if config is bad, or maybe we should error. 
                // But main flow will fail anyway if apiKey is missing. 
            } else {
                const validation = await validateDomain(userDomain, question, apiKey, model);
                if (!validation.isMatch) {
                    return c.json({
                        id: crypto.randomUUID(),
                        question,
                        answer: `### ❌ Domain Mismatch\n\n**Your Profile Domain**: ${userDomain}\n**Job Domain**: ${validation.jobDomain || 'Different'}\n\n${validation.reason}\n\n**Recommendation**: Please switch to a profile that matches this job description or update your domain settings.`,
                        fitscore: 0,
                        timestamp: new Date().toISOString(),
                        userId
                    });
                }
            }
        }

        const userRole = c.get('role');

        const conditions = [eq(resumesTable.userId, userId)];
        if (userRole === 'SUPER_ADMIN') {
            conditions.push(eq(users.role, 'SUPER_ADMIN')); // Admin sees admin resumes too (or just their own? keeping permissive for admin)
        } else if (userDomain) {
            // STRICT: Only resumes matching the domain. 
            // We search for resumes that belong to the user AND match the domain, 
            // OR published/global resumes (if we had that concept) that match the domain.
            // For now, let's assume we just want the user's resumes that match the domain.
            // But wait, the previous logic allowed "eq(users.role, 'SUPER_ADMIN')". 
            // The requirement says: "if has same domain resume to that user then will create proposal".
            // Implementation: Filter finding resumes where (userId = me OR role = admin) AND domain = myDomain.
            conditions.push(eq(users.role, 'SUPER_ADMIN'));
        }

        let query = db.select({
            id: resumesTable.id,
            content: resumesTable.contentChunk,
            userId: resumesTable.userId,
            domain: resumesTable.domain
        })
            .from(resumesTable)
            .leftJoin(users, eq(resumesTable.userId, users.id));

        if (userDomain && userRole !== 'SUPER_ADMIN') {
            // Strict filter: Match Domain (Consistency with Visibility)
            // If user sees a resume on the dashboard (because it matches their domain), they can use it here.
            query = query.where(eq(resumesTable.domain, userDomain)) as any;
        } else {
            // Default/Admin behavior (permissive)
            query = query.where(
                or(
                    eq(resumesTable.userId, userId),
                    eq(users.role, 'SUPER_ADMIN')
                )
            ) as any;
        }

        const resumes = await query;

        // 1. Hard check: If no resumes at all, reject immediately
        if (resumes.length === 0) {
            const domainMsg = userDomain ? ` for the domain **${userDomain}**` : '';
            return c.json({
                id: crypto.randomUUID(),
                question,
                answer: `### ❌ No Resumes Found${domainMsg}\nYou haven't generated any resumes yet${domainMsg}. Please visit the **Resume Generator** to create a professional profile${domainMsg} before generating a proposal.`,
                fitscore: 0,
                timestamp: new Date().toISOString(),
                userId
            });
        }

        // 2. Format resumes for prompt
        const resumesContext = resumes.map((r: any) => `DOMAIN: ${r.domain}\nCONTENT: ${r.content}`).join('\n\n---\n\n');

        // Dynamic Persona based on Domain -> Now focused on WRITING the proposal
        let expertPersona = "Elite Proposal Writer & Career Strategist";

        const systemPrompt = `You are an ${expertPersona}.
        Your TASK is to write a highly professional, persuasive, and custom tailored cover letter/proposal ON BEHALF OF the user for a specific job.

        ### USER'S RESUME (Your Identity):
        ${resumesContext}
        
        ### TARGET JOB DESCRIPTION:
        ${question}
        
        ### EVALUATION & GENERATION PROTOCOL:
        
        1. **GATEKEEPER: RELEVANCE CHECK**
           - **User Domain**: **${userDomain}**
           - **Rule**: Verify if the user's resume technically qualifies for this job.
             - **Match**: If the core tech stack or domain aligns (e.g. React dev applying for Frontend Lead), PROCEED.
             - **Mismatch**: If the domains are fundamentally different (e.g. React dev applying for Data Science), REJECT.
           - **If Rejected**: Output JSON with 'fitscore: 0' and 'proposal: "❌ Domain Mismatch: This job appears to be outside your expertise area based on your current profile permissions (${userDomain})."' and STOP.

        2. **SCORING (Fit Analysis)**:
           - **Analyze the gap** between resume skills and job requirements.
           - **Perfect Match (90-100)**: Hand-in-glove fit.
           - **Good Match (75-89)**: Minor skill gaps but strong core alignment.
           - **Average Match (60-74)**: Missing some key requirements but adaptable.
           - **Weak Match (<60)**: Significant gaps.

        3. **PROPOSAL GENERATION (The Output)**:
           - **VOICE**: Write in the **FIRST PERSON ("I")**. You ARE the candidate.
           - **TONE**: Professional, confident, concise, and solution-oriented.
           - **STRUCTURE**:
             - **Hook**: Immediately address the client's specific need/problem.
             - **Value**: detailed how your specific past experience (from resume) solves their problem.
             - **Call to Action**: A confident closing inviting discussion.
           - **ABSOLUTE PROHIBITIONS**:
             - ❌ NEVER say "Based on your resume" or "Reviewing your profile".
             - ❌ NEVER say "I am a strong candidate for..." as an opener. Be more creative.
             - ❌ NEVER mention "fit score" or internal logic in the proposal text.
             - ❌ Do NOT include placeholders like "[Your Name]".
           - **LENGTH**: roughly 200-300 words. Short and punchy.

        4. **OUTPUT FORMAT**:
           Return ONLY a valid JSON object:
           {
             "fitscore": number, // 0-100
             "proposal": "string", // The professional cover letter text (markdown allowed)
             "requirementMatrix": [ // Array of objects
               { "requirement": "Job Requirement", "match": "Your specific matching skill/experience" }
               // ... map key requirements to user skills
             ],
             "clarifyingQuestions": [ // Array of strings
               "Question 1",
               "Question 2",
               "Question 3"
             ]
           }`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
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
                    let formattedMatrix = '';
                    if (Array.isArray(matrix)) {
                        formattedMatrix = matrix.map((item: any) => {
                            if (typeof item === 'string') return item;
                            if (typeof item === 'object' && item !== null) {
                                // Handle { requirement: "...", match: "..." } pattern
                                if (item.requirement && item.match) return `- **${item.requirement}**: ${item.match}`;
                                if (item.requirementName && item.match) return `- **${item.requirementName}**: ${item.match}`;
                                if (item.requirementName) return `- ${item.requirementName}`; // Handle case with no match value
                                if (item.skill && item.level) return `- **${item.skill}**: ${item.level}`;

                                // Fallback: Convert first key-value pair to string: "- Key: Value"
                                const entries = Object.entries(item);
                                if (entries.length > 0) {
                                    return `- **${entries[0][0]}**: ${entries[0][1]}`;
                                }
                            }
                            return JSON.stringify(item);
                        }).join('\n');
                    } else {
                        formattedMatrix = matrix;
                    }
                    chunks.push('## Requirement Matrix\n' + formattedMatrix);
                }

                const questions = parsed.clarifyingQuestions;
                if (questions && (typeof questions === 'string' && questions.trim() || Array.isArray(questions))) {
                    let formattedQuestions = '';
                    if (Array.isArray(questions)) {
                        formattedQuestions = questions.map((q: any) => {
                            if (typeof q === 'string') return `- ${q}`;
                            if (typeof q === 'object' && q !== null) {
                                // Handle { question: "...", context: "..." } or simple key-value
                                if (q.question) return `- ${q.question}`;
                                const entries = Object.entries(q);
                                if (entries.length > 0) return `- ${entries[0][1]}`;
                            }
                            return `- ${JSON.stringify(q)}`;
                        }).join('\n');
                    } else {
                        formattedQuestions = questions;
                    }
                    chunks.push('## Clarifying Questions\n' + formattedQuestions);
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
