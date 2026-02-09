import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq, and, gt, sql } from 'drizzle-orm'
import { jobs, outputs, resumes } from '../db/schema.js'
import { Bindings, Variables } from '../types.js'
import { GeminiClient } from '../lib/gemini.js'

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

app.post('/proposal/:jobId', async (c) => {
    const userId = c.get('userId');
    const jobId = c.req.param('jobId');
    const dbUrl = (c.env.DATABASE_URL || process.env.DATABASE_URL) as string;
    const apiKey = (c.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY) as string;

    const neonClient = neon(dbUrl);
    const db = drizzle(neonClient);
    const gemini = new GeminiClient(apiKey);

    try {
        // 1. Fetch Job and Analysis
        const jobResult = await db.select().from(jobs).where(eq(jobs.id, jobId));
        const job = jobResult[0];
        if (!job || job.userId !== userId) return c.json({ error: 'Job not found' }, 404);

        const outputResult = await db.select().from(outputs).where(eq(outputs.jobId, jobId));
        const output = outputResult[0];
        if (!output) return c.json({ error: 'Analysis not found. Run analysis first.' }, 400);

        if (output.proposalText) return c.json({ proposal: output.proposalText });

        // 2. Vector Search for relevant resume chunks
        const jobEmbedding = await gemini.generateEmbedding(job.inputContent);

        // Drizzle doesn't support vector similarity directly in high-level API well without customs
        // We will use raw SQL for the vector search
        const embeddingString = `[${jobEmbedding.join(',')}]`;

        // Find top 7 chunks for this user and domain
        const relevantChunks = await db.execute(sql`
            SELECT content_chunk, (embedding <=> ${embeddingString}::vector) as distance
            FROM resumes
            WHERE user_id = ${userId} AND domain = ${job.domain || 'Fullstack'}
            ORDER BY distance ASC
            LIMIT 7
        `) as any;

        const resumeContext = relevantChunks.rows.map((r: any) => r.content_chunk).join('\n\n');

        // 3. Generate Proposal
        const prompt = `You are a high-end consultant generating a tailored Upwork proposal.
        
        JOB DESCRIPTION:
        "${job.inputContent}"
        
        CLIENT PERSONA:
        ${JSON.stringify(output.personaAnalysis)}
        
        EXPERT ANALYSIS:
        ${JSON.stringify(output.requirementsMatrix)}
        
        MY RELEVANT EXPERIENCE (RESUME CHUNKS):
        ${resumeContext}
        
        GUIDELINES:
        - DO NOT use generic templates ("Dear Hiring Manager").
        - Adapt tone based on persona (Technical vs Non-technical).
        - Focus on solving their risks and explicit requirements.
        - Inject specific proof points from the resume context.
        - Short jobs (1-2 sentences) get short replies. Complex jobs get full proposals.
        - Only mention pricing if client asked.
        
        Format output in Markdown. Start directly with the text.`;

        const proposal = await gemini.generateContent(prompt);

        // 4. Save and Update Status
        await db.update(outputs).set({ proposalText: proposal }).where(eq(outputs.jobId, jobId));
        await db.update(jobs).set({ status: 'PROPOSAL_READY', updatedAt: new Date() }).where(eq(jobs.id, jobId));

        return c.json({ proposal });

    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default app;
