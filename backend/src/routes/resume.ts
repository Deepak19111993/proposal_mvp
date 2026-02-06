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

    // if (userRole !== 'SUPER_ADMIN') {
    //    return c.json({ error: 'Forbidden' }, 403);
    // }

    if (!role || !description) return c.json({ error: 'Role and description are required' }, 400);

    // Enforce User's Domain
    let targetDomain = domain;
    const userDomain = c.get('domain');
    if (userRole !== 'SUPER_ADMIN' && userDomain) {
        targetDomain = userDomain;
    }

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

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-robotics-er-1.5-preview:generateContent?key=${apiKey}`, {
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

    const resumeItem = { id, role, description, domain: targetDomain, content: resumeContent, userId };

    try {
        await db.insert(resumes).values(resumeItem);
    } catch (e: any) {
        console.error("Failed to save resume", e);
        return c.json({ error: `Failed to save resume: ${e.message}` }, 500);
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

    let query = db.select({
        id: resumes.id,
        role: resumes.role,
        description: resumes.description,
        domain: resumes.domain,
        content: resumes.content,
        timestamp: resumes.timestamp,
        userId: resumes.userId,
    }).from(resumes).leftJoin(users, eq(resumes.userId, users.id));

    const userRole = c.get('role');
    const userDomain = c.get('domain');

    if (userRole === 'SUPER_ADMIN') {
        // Super Admin sees all
    } else {
        // User sees:
        // 1. Their own created resumes (if any)
        // 2. Resumes matching their domain
        // 3. (Optional) Global resumes (domain is null)? - Let's assume strict domain matching for now based on user request "only user see that domain resume"

        const conditions = [eq(resumes.userId, userId)];
        if (userDomain) {
            conditions.push(eq(resumes.domain, userDomain));
        } else {
            // If user has NO domain, maybe they see nothing purely domain-based? 
            // Or maybe they see resumes with NO domain?
            // Let's assume they see resumes with NO domain or their own.
            // conditions.push(isNull(resumes.domain)); // Need isNull import... or just eq(resumes.domain, null)? Drizzle checks null.
        }

        // Use OR logic: My Own OR Domain Match
        // We need 'or' from drizzle
        query = query.where(or(...conditions)) as any;
    }

    const result = await query.orderBy(desc(resumes.timestamp)).all();

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
