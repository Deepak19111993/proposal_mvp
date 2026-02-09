import { Hono } from 'hono'
import crypto from 'node:crypto'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq, desc } from 'drizzle-orm'
import { jobs, outputs } from '../db/schema.js'
import { Bindings, Variables } from '../types.js'
import { processJobAnalysis } from '../services/analysis.js'

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Submit Job
app.post('/jobs', async (c) => {
    const userId = c.get('userId');
    const { inputType, inputContent, title } = await c.req.json();

    if (!inputType || !inputContent) return c.json({ error: 'Input type and content required' }, 400);

    const dbUrl = (c.env.DATABASE_URL || process.env.DATABASE_URL) as string;
    const apiKey = (c.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY) as string;

    const sql = neon(dbUrl);
    const db = drizzle(sql);

    const jobId = crypto.randomUUID();

    try {
        await db.insert(jobs).values({
            id: jobId,
            userId,
            title: title || 'New Job Analysis',
            inputType,
            inputContent,
            status: 'QUEUED'
        });

        // Background process (we don't await it so we can return response immediately)
        // Note: In Cloudflare Workers/Vercel Node runtime without queues, this might be tricky.
        // For now, we await it or use c.executionCtx.waitUntil(promise) if in Worker.
        // Since we are in Node Serverless on Vercel, we can try to respond after starting or just await it if we want it synchronous.
        // User requested "polling", so we can just start it.

        // Vercel Specific: We should probably just trigger it and let it run, but Node serverless shuts down after response.
        // For MVP, we will await it to ensure it finishes within the same request or use a separate "trigger" endpoint.
        // Let's await it for reliability in serverless.
        processJobAnalysis(dbUrl, jobId, apiKey).catch(e => console.error("Async Analysis Error", e));

        return c.json({ id: jobId, status: 'QUEUED' });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// List Jobs
app.get('/jobs', async (c) => {
    const userId = c.get('userId');
    const dbUrl = (c.env.DATABASE_URL || process.env.DATABASE_URL) as string;
    const sql = neon(dbUrl);
    const db = drizzle(sql);

    const userJobs = await db.select().from(jobs).where(eq(jobs.userId, userId)).orderBy(desc(jobs.createdAt));
    return c.json(userJobs);
});

// Get Job Status & Detail
app.get('/jobs/:id', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const dbUrl = (c.env.DATABASE_URL || process.env.DATABASE_URL) as string;
    const sql = neon(dbUrl);
    const db = drizzle(sql);

    const jobResult = await db.select().from(jobs).where(eq(jobs.id, id));
    const job = jobResult[0];

    if (!job) return c.json({ error: 'Not found' }, 404);
    if (job.userId !== userId) return c.json({ error: 'Forbidden' }, 403);

    // Fetch outputs if available
    const outputResult = await db.select().from(outputs).where(eq(outputs.jobId, id));

    return c.json({ ...job, analysis: outputResult[0] || null });
});

export default app;
