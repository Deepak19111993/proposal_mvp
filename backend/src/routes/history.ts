import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, desc } from 'drizzle-orm'
import { history } from '../db/schema'
import { Bindings, Variables } from '../types'

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

app.get('/', async (c) => {
    const userId = c.get('userId');
    const db = drizzle(c.env.MY_DB);

    // List only for this user
    const historyData = await db.select().from(history)
        .where(eq(history.userId, userId))
        .orderBy(desc(history.timestamp))
        .all();

    return c.json(historyData);
})

app.get('/:id', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const db = drizzle(c.env.MY_DB);

    // Strict check ensures users can only access their own history
    const data = await db.select().from(history)
        .where(eq(history.id, id))
        .get();

    if (!data || data.userId !== userId) {
        return c.json({ error: 'History not found' }, 404);
    }

    return c.json(data);
})

app.delete('/:id', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const db = drizzle(c.env.MY_DB);
    const role = c.get('role');

    // Fetch the history item to check ownership
    const item = await db.select().from(history).where(eq(history.id, id)).get();

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
