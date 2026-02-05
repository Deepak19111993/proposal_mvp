import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, desc, or } from 'drizzle-orm'
import { resumes, users } from '../db/schema'
import { Bindings, Variables } from '../types'

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Resume Generator
app.post('/resume/generate', async (c) => {
    const userId = c.get('userId');
    const { role, description, domain } = await c.req.json();
    const apiKey = c.env.GEMINI_API_KEY;
    const userRole = c.get('role');

    if (userRole !== 'SUPER_ADMIN') {
        return c.json({ error: 'Forbidden' }, 403);
    }

    if (!role || !description) return c.json({ error: 'Role and description are required' }, 400);

    let resumeContent = "Failed to generate resume.";

    try {
        const systemPrompt = `You are an expert Resume Writer.
            Create a professional, ATS-friendly resume for the role of "${role}"${domain ? ` in the domain of "${domain}"` : ''}.
            
            Use the following description/context to tailor the resume:
            "${description}"
            
            Format the output in Markdown.
            Include specific sections: Summary, Skills, Experience (make up realistic placeholders based on description), and Education.
            
            IMPORTANT: Do NOT include any personal contact information placeholders such as "[YOUR NAME]", "[Address]", "[Phone]", or "[Email]". 
            Start directly with the "SUMMARY" or "PROFESSIONAL SUMMARY" section.
            Do not include any preambles like "Here is your resume", just give the markdown content.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }]
            })
        });

        const data = await response.json() as any;
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            resumeContent = data.candidates[0].content.parts[0].text;
        } else if (data.error) {
            resumeContent = `API Error: ${data.error.message}`;
        }
    } catch (e: any) {
        resumeContent = `Application Error: ${e.message}`;
    }

    const id = crypto.randomUUID();
    const db = drizzle(c.env.MY_DB);

    const resumeItem = { id, role, description, domain, content: resumeContent, userId };

    try {
        await db.insert(resumes).values(resumeItem);
    } catch (e) {
        console.error("Failed to save resume", e);
    }

    return c.json({ ...resumeItem, timestamp: new Date().toISOString() });
});

app.patch('/resume/:id', async (c) => {
    const role = c.get('role');
    const id = c.req.param('id');
    const { domain } = await c.req.json();
    const db = drizzle(c.env.MY_DB);

    if (role !== 'SUPER_ADMIN') {
        return c.json({ error: 'Forbidden' }, 403);
    }

    try {
        await db.update(resumes).set({ domain }).where(eq(resumes.id, id));
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

app.get('/resumes', async (c) => {
    const userId = c.get('userId');
    const db = drizzle(c.env.MY_DB);

    const result = await db.select({
        id: resumes.id,
        role: resumes.role,
        description: resumes.description,
        domain: resumes.domain,
        content: resumes.content,
        timestamp: resumes.timestamp,
        userId: resumes.userId,
    })
        .from(resumes)
        .leftJoin(users, eq(resumes.userId, users.id))
        .where(
            or(
                eq(resumes.userId, userId),
                eq(users.role, 'SUPER_ADMIN')
            )
        )
        .orderBy(desc(resumes.timestamp))
        .all();

    return c.json(result);
});

app.delete('/resume/:id', async (c) => {
    const role = c.get('role');
    const id = c.req.param('id');
    const db = drizzle(c.env.MY_DB);

    if (role !== 'SUPER_ADMIN') {
        return c.json({ error: 'Forbidden' }, 403);
    }

    try {
        await db.delete(resumes).where(eq(resumes.id, id));
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default app
