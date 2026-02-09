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

    try {
        // 1. Fetch user's resumes AND Admin resumes for context (Filtered by Domain)
        const userDomain = c.get('domain');
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

        // Dynamic Persona based on Domain
        let expertPersona = "ELITE Recruitment Specialist and Proposal Architect";
        if (userDomain === 'GenAI') expertPersona = "World-Class Generative AI Solutions Architect & Proposal Expert";
        else if (userDomain === 'Fullstack') expertPersona = "Senior Fullstack Engineering Lead & Technical Proposal Strategist";
        else if (userDomain === 'DevOps') expertPersona = "Principal DevOps Engineer & Infrastructure Consultant";
        else if (userDomain === 'AI/ML') expertPersona = "Chief AI/ML Scientist & Algorithm Strategist";

        const systemPrompt = `You are an ${expertPersona}.
        Your ABSOLUTE PRIORITY is to verify if requested Job Requirements match the User's Professional Background (Resumes).
        
        ### USER'S RESUMES:
        ${resumesContext}
        
        ### TARGET JOB REQUIREMENTS:
        ${question}
        
        ### EVALUATION PROTOCOL:
        1. **GATEKEEPER: DOMAIN & SKILL MATCHING** (CRITICAL PRIORITIZATION)
           - **User Domain**: **${userDomain}**
           - **CORE RULE**: **HARD SKILLS TRUMP JOB TITLES**.
             - If the Job requires **TECHNICAL SKILLS** that exist in the User's Domain (e.g., Node.js, React for Fullstack), it is a **VALID MATCH**.
             - **ACCEPT**: "Architect", "Team Lead", "Manager", "Interviewer", "Consultant" roles IF the tech stack aligns.
           - **DOMAIN CHECK**:
             - **MATCH**: User "Fullstack" vs Job "Senior Node.js Architect" -> **MATCH** (Same Tech Stack).
             - **MATCH**: User "Fullstack" vs Job "Technical Interviewer (React/Node)" -> **MATCH** (User has skills to interview).
             - **MISMATCH**: User "Fullstack" vs Job "Data Scientist" (Python/ML) -> **REJECT** (Different Tech Stack).
           - **If Rejected**: Output JSON with 'fitscore: 0' and 'proposal: "❌ Domain Mismatch: This job is for [Job Domain], but your profile is [User Domain]."' and STOP.


        2. **ELIGIBILITY CHECK**: If Domain is valid, check for specific skills.

           - **ALLOWED VARIATIONS**:
             - **Role Seniority**: "Senior", "Lead", "Architect", "Manager", "Staff" are VALID matches if the tech stack fits.
             - **Tech Stack**: If User Domain is "Fullstack", jobs asking for "Node.js", "React", "Frontend", "Backend", "Web Architect" are VALID matches.
           - **Refusal Trigger**: If the domain is fundamentally different (e.g., "Legal", "Medical", "Embedded Systems" vs "Web"), Output 'fitscore: 0' immediately.

        3. **IF REJECTED (No valid match)**:
           - Set "fitscore" to 0.
           - Set "proposal" to: "### ❌ Mismatched Background\nYour current professional profile does not appear to contain the necessary skills for this role. I checked for relevant keywords but couldn't find a strong enough link.\n\n**Recommendation**: Please create a resume that explicitly highlights these skills."
           - Set "requirementMatrix" and "clarifyingQuestions" to empty strings.

        4. **IF ELIGIBLE MATCH - SCORING ALGORITHM (Gap Analysis)**:
           - **Start Score**: 100.
           - **Deductions**:
             - **Missing Key Tech**: -15 points per missing MAJOR skill (e.g., Job needs React, User has only Angular).
             - **Missing Seniority**: -10 points if Job is "Lead/Architect" but User is "Mid-Level".
             - **Missing Domain Experience**: -10 points if Job needs specific industry xp (e.g., Fintech) user lacks.
             - **Perfect Match**: If User has ALL skills + Seniority -> Score 95-100.
             - **Good Match**: Missing 1 minor skill -> Score 85-94.
             - **Average Match**: Missing 1 major skill or Seniority gap -> Score 70-84.
             - **Weak Match**: Missing multiple skills -> Score 50-69.
           - **Set "fitscore"**: Calculated based on above deductions.

        5. **PROPOSAL GENERATION**:
           - "proposal": A professional intro/narrative (max 400 words). Do NOT include internal IDs or placeholders. Focus on the value proposition.
           - "requirementMatrix": A point-wise Markdown list showing how your skills match requirements. Each point should look like: "- [Requirement Name]: [Matching Skill/Experience from your Resume Role]". Do NOT include IDs.
           - "clarifyingQuestions": Max 3 strategic questions for the client.

        Output MUST be a valid JSON object with keys: fitscore, proposal, requirementMatrix, clarifyingQuestions.`;

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
