import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq, desc } from 'drizzle-orm'
import { history } from '../db/schema.js'
import { Bindings, Variables } from '../types.js'

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

app.get('/', async (c) => {
    const userId = c.get('userId');
    const dbUrl = c.env.DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) return c.json({ error: 'Database URL not configured' }, 500);
    const sql = neon(dbUrl);
    const db = drizzle(sql);

    // List only for this user
    const historyData = await db.select().from(history)
        .where(eq(history.userId, userId))
        .orderBy(desc(history.timestamp));

    return c.json(historyData);
})

app.get('/:id', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const dbUrl = c.env.DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) return c.json({ error: 'Database URL not configured' }, 500);
    const sql = neon(dbUrl);
    const db = drizzle(sql);

    // Strict check ensures users can only access their own history
    const dataResult = await db.select().from(history)
        .where(eq(history.id, id));
    const data = dataResult[0];

    if (!data || data.userId !== userId) {
        return c.json({ error: 'History not found' }, 404);
    }

    return c.json(data);
})

app.delete('/:id', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const dbUrl = c.env.DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) return c.json({ error: 'Database URL not configured' }, 500);
    const sql = neon(dbUrl);
    const db = drizzle(sql);
    const role = c.get('role');

    // Fetch the history item to check ownership
    const itemResult = await db.select().from(history).where(eq(history.id, id));
    const item = itemResult[0];

    if (!item) {
        return c.json({ error: 'History not found' }, 404);
    }

    // Allow if Super Admin OR if it's the user's own item
    if (role !== 'SUPER_ADMIN' && item.userId !== userId) {
        return c.json({ error: 'Forbidden' }, 403);
    }

    try {
        await db.delete(history).where(eq(history.id, id));
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
})

export default app
