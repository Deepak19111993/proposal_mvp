import { Hono } from 'hono'
import crypto from 'node:crypto'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq, desc, and, or } from 'drizzle-orm'
import { resumes, users } from '../db/schema.js'
import { Bindings, Variables } from '../types.js'
import { GeminiClient } from '../lib/gemini.js'

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

app.post('/resume/generate', async (c) => {
    try {
        console.log("DEBUG: POST /resume/generate hit");
        const userId = c.get('userId');
        const userRole = c.get('role');
        const userDomain = c.get('domain');
        console.log(`DEBUG: User: ${userId}, Role: ${userRole}, Domain: ${userDomain}`);

        const { role, description, domain } = await c.req.json();
        console.log(`DEBUG: Payload: role=${role}, domain=${domain}`);

        const dbUrl = (c.env.DATABASE_URL || process.env.DATABASE_URL) as string;
        const apiKey = (c.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY) as string;

        if (!dbUrl) throw new Error("DATABASE_URL is missing");
        if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

        if (!role || !description) return c.json({ error: 'Role and description are required' }, 400);

        // Enforce User's Domain
        let targetDomain = domain || 'Fullstack';
        if (userRole !== 'SUPER_ADMIN' && userDomain) {
            targetDomain = userDomain;
        }

        const gemini = new GeminiClient(apiKey);
        console.log(`DEBUG: Processing resume for role: ${role}`);

        // PURE CHUNKING REMOVED: Store full content in one go
        const resumeContent = description;

        const sql = neon(dbUrl);
        const db = drizzle(sql);

        // Limit embedding input to avoid model errors, but store FULL content
        const embeddingInput = resumeContent.slice(0, 9000);
        const mainId = crypto.randomUUID();

        console.log(`DEBUG: Generating embedding for resume (${resumeContent.length} chars)`);
        const embedding = await gemini.generateEmbedding(embeddingInput);
        console.log(`DEBUG: Embedding generated (${embedding.length} dims)`);

        console.log(`DEBUG: Inserting resume into DB`);
        await db.insert(resumes).values({
            id: mainId,
            userId,
            domain: targetDomain,
            role,
            description: description.substring(0, 100), // Store snippet for display
            contentChunk: resumeContent, // STORE FULL CONTENT
            embedding,
            metadata: {
                type: 'manual_full',
                originalLength: resumeContent.length
            }
        });

        console.log("DEBUG: Resume inserted successfully");

        return c.json({ id: mainId, role, domain: targetDomain, success: true });

    } catch (e: any) {
        console.error("CRITICAL: Resume generation failed", e);
        return c.json({
            error: `Internal Server Error: ${e.message}`,
            details: e.stack,
            type: e.name
        }, 500);
    }
});

app.post('/resumes', async (c) => {
    const userId = c.get('userId');
    const { content, domain, role, description, metadata } = await c.req.json();

    if (!content || !domain) return c.json({ error: 'Content and domain are required' }, 400);

    const dbUrl = (c.env.DATABASE_URL || process.env.DATABASE_URL) as string;
    const apiKey = (c.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY) as string;

    const sql = neon(dbUrl);
    const db = drizzle(sql);
    const gemini = new GeminiClient(apiKey);

    try {
        const mainId = crypto.randomUUID();

        // Limit embedding input
        const embeddingInput = content.slice(0, 9000);
        const embedding = await gemini.generateEmbedding(embeddingInput);

        await db.insert(resumes).values({
            id: mainId,
            userId,
            domain,
            role: role || 'Manual Upload',
            description: description || 'No description provided',
            contentChunk: content, // STORE FULL CONTENT
            embedding,
            metadata: {
                ...(metadata || {}),
                type: 'manual_full',
                originalLength: content.length
            }
        });

        return c.json({ success: true, count: 1, id: mainId });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

app.get('/resumes', async (c) => {
    const userId = c.get('userId');
    const dbUrl = (c.env.DATABASE_URL || process.env.DATABASE_URL) as string;
    const sql = neon(dbUrl);
    const db = drizzle(sql);

    // Filter to return head chunks or manual chunks, ordered by date

    // If user has a domain, they can see all resumes in that domain OR their own
    const userDomain = c.get('domain');

    const whereClause = userDomain
        ? or(eq(resumes.userId, userId), eq(resumes.domain, userDomain))
        : eq(resumes.userId, userId);

    const userResumes = await db.select({
        id: resumes.id,
        domain: resumes.domain,
        role: resumes.role,
        description: resumes.description,
        content: resumes.contentChunk,
        timestamp: resumes.createdAt,
        userId: resumes.userId
    }).from(resumes)
        .where(whereClause)
        .orderBy(desc(resumes.createdAt));

    return c.json(userResumes);
});

app.patch('/resume/:id', async (c) => {
    const id = c.req.param('id');
    const { domain, role } = await c.req.json();
    const dbUrl = (c.env.DATABASE_URL || process.env.DATABASE_URL) as string;
    const sql = neon(dbUrl);
    const db = drizzle(sql);

    try {
        const updateData: any = {};
        if (domain) updateData.domain = domain;
        if (role) updateData.role = role;

        await db.update(resumes).set(updateData).where(eq(resumes.id, id));
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

app.delete('/resume/:id', async (c) => {
    const id = c.req.param('id');
    const dbUrl = (c.env.DATABASE_URL || process.env.DATABASE_URL) as string;
    const sql = neon(dbUrl);
    const db = drizzle(sql);

    try {
        await db.delete(resumes).where(eq(resumes.id, id));
        // We should also delete children if grouped, but for now we delete the chunk the user selected
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default app;
