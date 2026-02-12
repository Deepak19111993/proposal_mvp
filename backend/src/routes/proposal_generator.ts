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
        let expertPersona = "Expert Upwork Freelancer & Strategic Partner";

        const systemPrompt = `You are an ${expertPersona}.
        Your TASK is to write a high-converting, practical, and solution-focused Upwork proposal ON BEHALF OF the user.

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
           - **CRITICAL**: Do NOT dock points for "missing" enterprise tech (Kubernetes, AWS) if the job is small/simple (e.g., "Fix my VPS"). Context matters!

        3. **PROPOSAL GENERATION (The Output)**:
           - **VOICE**: Write in the **FIRST PERSON ("I")**. You ARE the candidate.
           - **TONE**: **Conversational, Direct, Competent, Low-Ego.** Avoid "Corporate Speak".
             - ❌ Bad: "I utilize a synergistic approach to leverage cloud-native paradigms."
             - ✅ Good: "I can fix your VPS script issues in about 2 hours using a cleaner bash script."
           - **STRUCTURE**:
             - **Hook**: Address the specific problem immediately. No "I am writing to apply..." fluff.
             - **Structure**:
               - **Greeting**: MANDATORY: Start with a simple "Hi," or "Hello,".
               - **Body**: Explain briefly *how* you will solve their problem using your specific skills.
               - **Proof**: Mention 1-2 relevant past projects/skills from your resume that prove you can do *this specific* job.
               - **Closing**: A confident closing inviting discussion (e.g., "Ready to start immediately. Let's chat?").
               - **Sign-off**: MANDATORY: End with "Best," or "Regards," followed by your name or a placeholder if unknown.
           - **ABSOLUTE PROHIBITIONS**:
             - ❌ NEVER say "Based on your resume" or "Reviewing your profile".
             - ❌ NEVER say "I am a strong candidate for..." as an opener. Be creative.
             - ❌ NEVER mention "fit score" or internal logic in the proposal text.
             - ❌ Do NOT include placeholders like "[Your Name]".
             - ❌ Do NOT suggest Enterprise solutions (K8s, Microservices) for small/medium tasks.
           - **HANDLING MISSING SKILLS**:
             - If the job requires a skill you don't have (based on the resume), **address it honestly**. 
             - Say you're happy to learn it, or ask if it's a hard requirement. 
             - **Do not lie** about having a skill you don't list.
          - **LENGTH**: Short and punchy (100-200 words max for most jobs).
            - **CLARIFYING QUESTIONS**:
              - **When to ask**: Only if critical information is missing that would prevent you from starting work.
                - ✅ Example: Job mentions "integrate with our API" but no API documentation or endpoint provided.
                - ✅ Example: "Deploy to our server" but no server details or access information.
                - ✅ Example: Job requires specific tech/framework not mentioned in job description.
              - **When NOT to ask**: 
                - ❌ Don't ask about preferences that can be discussed later (e.g., "What color scheme?").
                - ❌ Don't ask about standard details you should already know (e.g., "What is React?").
                - ❌ Don't ask if the job description is already clear and complete.
              - **Format**: Keep questions brief and specific (2-3 max).
         4. **OUTPUT FORMAT**:
            Return ONLY a valid JSON object:
            {
              "fitscore": number, // 0-100
              "proposal": "string", // The proposal text (markdown allowed)
              "requirementMatrix": "string", // Bullet points showing: Skill Name (✅ Yes / 📚 Learning / ❌ No)
              "clarifyingQuestions": [ // Array - include ONLY if critical info is missing to start work
                "Question 1"
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

            const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

            try {
                const parsed = JSON.parse(cleanText);
                fitscore = typeof parsed.fitscore === 'number' ? parsed.fitscore : 0;

                let chunks = [];
                let proposalText = parsed.proposal || "";
                console.log("===== PROPOSAL GENERATION DEBUG =====");
                console.log("RAW PROPOSAL FROM GEMINI:", proposalText.substring(0, 100));

                // Safety: Remove Requirement Matrix if it leaked into the proposal text
                if (proposalText.match(/##?\s*Requirement Matrix/i)) {
                    proposalText = proposalText.split(/##?\s*Requirement Matrix/i)[0].trim();
                }

                // Force Greeting
                console.log("BEFORE GREETING CHECK:", proposalText.substring(0, 50));
                if (!proposalText.match(/^\s*(Hi|Hello|Dear)\b/i)) {
                    console.log("NO GREETING FOUND - ADDING");
                    proposalText = "Hi,\n\n" + proposalText;
                } else {
                    console.log("GREETING ALREADY EXISTS");
                }

                // Note: Strip any AI-generated sign-off from here so we can add it at the very end
                // This removes "Best, Deepak" etc. from the middle of the document
                proposalText = proposalText.replace(/(Best|Regards|Sincerely|Thanks|Cheers)[,\s]*[\n]*([A-Za-z\s]+)?$/gi, '').trim();

                if (proposalText) chunks.push(proposalText);

                const matrix = parsed.requirementMatrix;
                if (matrix && typeof matrix === 'string' && matrix.trim()) {
                    chunks.push('## Requirement Matrix\n' + matrix);
                }

                const questions = parsed.clarifyingQuestions;
                if (questions && (typeof questions === 'string' && questions.trim() || Array.isArray(questions))) {
                    let formattedQuestions = '';
                    if (Array.isArray(questions) && questions.length > 0) {
                        formattedQuestions = questions.map((q: any) => {
                            if (typeof q === 'string') return `- ${q}`;
                            if (typeof q === 'object' && q !== null) {
                                if (q.question) return `- ${q.question}`;
                                const entries = Object.entries(q);
                                if (entries.length > 0) return `- ${entries[0][1]}`;
                            }
                            return `- ${JSON.stringify(q)}`;
                        }).join('\n');
                        chunks.push('## Clarifying Questions (Optional)\n' + formattedQuestions);
                    } else if (typeof questions === 'string') {
                        formattedQuestions = questions;
                        chunks.push('## Clarifying Questions\n' + formattedQuestions);
                    }
                }

                answer = chunks.join('\n\n');
                console.log("FINAL ANSWER (first 150 chars):", answer.substring(0, 150));
                console.log("FINAL ANSWER (last 150 chars):", answer.slice(-150));
                console.log("===== END DEBUG =====");
            } catch (e) {
                console.error("Failed to parse JSON response:", rawText);
                // Fallback: If parsing fails, try to strip the matrix manually if present
                const fallbackText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

                if (fallbackText.match(/##?\s*Requirement Matrix/i)) {
                    answer = fallbackText.split(/##?\s*Requirement Matrix/i)[0].trim();
                } else {
                    answer = fallbackText;
                }

                // Force Greeting (Fallback)
                if (!answer.match(/^\s*(Hi|Hello|Dear)\b/i)) {
                    answer = "Hi,\n\n" + answer;
                }

                // Force Sign-off (Fallback) - Check last 100 chars
                if (!answer.match(/(Best|Regards|Sincerely|Thanks|Cheers)(?:,|!)?[\s\S]{0,100}$/i)) {
                    answer = answer.trim() + "\n\nBest,\n[Your Name]";
                }
            }
        } else if (data.error) {
            answer = `API Error: ${data.error.message}`;
        }
    } catch (e: any) {
        answer = `Application Error: ${e.message}`;
    }

    // FINAL ENFORCEMENT: Ensure greeting and sign-off are present
    // This runs AFTER all other logic, guaranteeing these elements are added
    if (answer && !answer.match(/API Error|Application Error|Domain Mismatch|No Resumes Found/)) {
        // Force Greeting if missing
        if (!answer.match(/^\s*(Hi|Hello|Dear)\b/i)) {
            answer = "Hi,\n\n" + answer;
        }

        // FINAL ENFORCEMENT: Ensure greeting is present
        // Add sign-off at the very end (after Questions)

        // Remove any premature sign-offs (Best, Regards, etc.) that appear before the end
        // This regex finds sign-offs followed by content (not at the end)
        answer = answer.replace(/(Best|Regards|Sincerely|Thanks|Cheers),?\s*\n+(?=[\s\S])/gi, '');

        // Ensure "Best,\n[Your Name]" is at the very end
        // First remove any existing end-of-text sign-off to avoid duplicates
        answer = answer.replace(/(Best|Regards|Sincerely|Thanks|Cheers)[,\s]*[\n]*([A-Za-z\s\[\]]+)?$/gi, '').trim();

        // Add the clean sign-off
        answer = answer + "\n\nBest,\n[Your Name]";
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
