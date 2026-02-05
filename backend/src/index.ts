import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { users, sessions, resumes, history } from './db/schema'
import { Bindings, Variables } from './types'
import historyRouter from './routes/history'
import resumeRouter from './routes/resume'
import chat from './routes/chat'

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Enable CORS
app.use('/*', cors())

// Auth Middleware
app.use('/api/*', async (c, next) => {
  const publicPaths = ['/api/login', '/api/setup'];
  if (publicPaths.includes(c.req.path)) {
    return next();
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.split(' ')[1];
  const db = drizzle(c.env.MY_DB);

  // Find session
  const session = await db.select().from(sessions).where(eq(sessions.id, token)).get();

  if (!session) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  // Get user role
  const user = await db.select().from(users).where(eq(users.id, session.userId)).get();

  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  c.set('userId', session.userId);
  c.set('role', user.role);
  await next();
});

// Setup Initial Super Admin
app.post('/api/setup', async (c) => {
  const db = drizzle(c.env.MY_DB);
  const userCount = await db.select({ count: users.id }).from(users).all();

  if (userCount.length > 0) {
    return c.json({ error: 'Setup already completed' }, 403);
  }

  const { email, password, name } = await c.req.json();
  if (!email || !password || !name) return c.json({ error: 'Missing fields' }, 400);

  const userId = crypto.randomUUID();
  try {
    await db.insert(users).values({
      id: userId,
      email,
      password,
      name,
      role: 'SUPER_ADMIN'
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }

  return c.json({ success: true });
});

// Admin Create User
app.post('/api/users', async (c) => {
  const role = c.get('role');
  if (role !== 'SUPER_ADMIN') {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const { email, password, name, role: newUserRole } = await c.req.json();
  if (!email || !password || !name) return c.json({ error: 'Missing fields' }, 400);

  const db = drizzle(c.env.MY_DB);
  const existingUser = await db.select().from(users).where(eq(users.email, email)).get();

  if (existingUser) return c.json({ error: 'User already exists' }, 409);

  const userId = crypto.randomUUID();
  try {
    await db.insert(users).values({
      id: userId,
      email,
      password,
      name,
      role: newUserRole || 'USER'
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }

  return c.json({ success: true });
});
// Admin: List Users
app.get('/api/users', async (c) => {
  const role = c.get('role');
  if (role !== 'SUPER_ADMIN') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const db = drizzle(c.env.MY_DB);
  const allUsers = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    password: users.password // Added password field
  }).from(users).all();
  return c.json(allUsers);
});

// Admin: Delete User
app.delete('/api/users/:id', async (c) => {
  const role = c.get('role');
  if (role !== 'SUPER_ADMIN') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const id = c.req.param('id');
  const db = drizzle(c.env.MY_DB);

  // Prevent deleting self? Maybe.
  // const currentUserId = c.get('userId');
  // if (currentUserId === id) return c.json({ error: 'Cannot delete yourself' }, 400);

  try {
    // Manual cascade delete
    await db.delete(sessions).where(eq(sessions.userId, id));
    await db.delete(resumes).where(eq(resumes.userId, id));
    await db.delete(history).where(eq(history.userId, id));

    await db.delete(users).where(eq(users.id, id));
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Admin: Update User
// Admin: Update User
app.patch('/api/users/:id', async (c) => {
  const role = c.get('role');
  if (role !== 'SUPER_ADMIN') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const id = c.req.param('id');
  const { password, email, name, role: userRole } = await c.req.json();

  const updateData: any = {};
  if (password) updateData.password = password;
  if (email) updateData.email = email;
  if (name) updateData.name = name;
  if (userRole) updateData.role = userRole;

  if (Object.keys(updateData).length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  const db = drizzle(c.env.MY_DB);
  try {
    await db.update(users).set(updateData).where(eq(users.id, id));
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Login
app.post('/api/login', async (c) => {
  const { email, password } = await c.req.json();
  const db = drizzle(c.env.MY_DB);

  const user = await db.select().from(users).where(eq(users.email, email)).get();

  if (!user) return c.json({ error: 'Invalid credentials' }, 401);

  if (user.password !== password) return c.json({ error: 'Invalid credentials' }, 401);

  const token = crypto.randomUUID();
  // Valid for session duration (could add expiration)
  await db.insert(sessions).values({
    id: token,
    userId: user.id
  });

  return c.json({ token, email: user.email, name: user.name, role: user.role });
});

// Mount Routes
app.route('/api/chat', chat)
app.route('/api/history', historyRouter)
app.route('/api', resumeRouter) // resume routes handles /resume/generate and /resumes

export default app
