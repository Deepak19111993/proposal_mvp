import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq } from 'drizzle-orm'
import { jobs, outputs } from '../db/schema.js'
import { Bindings, Variables } from '../types.js'
import { GeminiClient } from '../lib/gemini.js'
import { refineProposal } from '../agents/critic.js'

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

app.post('/critic/:jobId', async (c) => {
    const userId = c.get('userId');
    const jobId = c.req.param('jobId');
    const dbUrl = (c.env.DATABASE_URL || process.env.DATABASE_URL) as string;
    const apiKey = (c.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY) as string;

    const sql = neon(dbUrl);
    const db = drizzle(sql);
    const gemini = new GeminiClient(apiKey);

    try {
        const jobResult = await db.select().from(jobs).where(eq(jobs.id, jobId));
        const job = jobResult[0];
        if (!job || job.userId !== userId) return c.json({ error: 'Job not found' }, 404);

        const outputResult = await db.select().from(outputs).where(eq(outputs.jobId, jobId));
        const output = outputResult[0];
        if (!output || !output.proposalText) return c.json({ error: 'Proposal not found. Generate proposal first.' }, 400);

        const refined = await refineProposal(gemini, output.proposalText, job.inputContent);

        await db.update(outputs).set({ refinedProposalText: refined }).where(eq(outputs.jobId, jobId));
        await db.update(jobs).set({ status: 'FINISHED', updatedAt: new Date() }).where(eq(jobs.id, jobId));

        return c.json({ original: output.proposalText, refined });

    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default app;
