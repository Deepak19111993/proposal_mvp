import { Hono } from 'hono'
import crypto from 'node:crypto'
// Force Vercel Update 2
import { cors } from 'hono/cors'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq } from 'drizzle-orm'
import { users, sessions, resumes, history } from './db/schema.js'
import { Bindings, Variables } from './types.js'
import historyRouter from './routes/history.js'
import resumeRouter from './routes/resumes.js'
import jobsRouter from './routes/jobs.js'
import proposalRouter from './routes/proposal.js'
import criticRouter from './routes/critic.js'
import proposalGenerator from './routes/proposal_generator.js'

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Enable CORS with explicit settings
app.use('/*', cors({
  origin: (origin) => origin, // Reflect origin for credentials support
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
  maxAge: 600,
  credentials: true,
}))

// Global Error Handler
app.onError((err, c) => {
  console.error(`GLOBAL_ERROR: ${err.message}`, err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  }, 500);
});

// Health Check / Server Status
app.get('/', (c) => {
  const envStatus = (c.env.GEMINI_MODEL || process.env.GEMINI_MODEL) ? 'configured' : 'missing-env';
  return c.json({
    status: 'ok',
    message: 'Hono Backend is running',
    timestamp: new Date().toISOString(),
    env: envStatus
  })
})

app.get('/api/debug', (c) => {
  const dbUrl = c.env.DATABASE_URL || process.env.DATABASE_URL;
  return c.json({
    hasDatabaseUrl: !!dbUrl,
    databaseUrlStart: dbUrl ? dbUrl.substring(0, 10) + '...' : 'MISSING',
    envKeys: Object.keys(c.env || {}),
    processEnvKeys: Object.keys(process.env || {})
  });
});

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
  const dbUrl = c.env.DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) return c.json({ error: 'Database URL not configured' }, 500);
  const sql = neon(dbUrl);
  const db = drizzle(sql);

  // Find session
  const sessionResult = await db.select().from(sessions).where(eq(sessions.id, token));
  const session = sessionResult[0];

  if (!session) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  // Get user role
  const userResult = await db.select().from(users).where(eq(users.id, session.userId));
  const user = userResult[0];

  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  c.set('userId', session.userId);
  c.set('role', user.role);
  if (user.domain) c.set('domain', user.domain);
  await next();
});

// Setup Initial Super Admin
app.post('/api/setup', async (c) => {
  const dbUrl = c.env.DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) return c.json({ error: 'Database URL not configured' }, 500);
  const sql = neon(dbUrl);
  const db = drizzle(sql);
  const userCount = await db.select({ count: users.id }).from(users);

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

  const { email, password, name, role: newUserRole, domain } = await c.req.json();
  if (!email || !password || !name) return c.json({ error: 'Missing fields' }, 400);

  const dbUrl = c.env.DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) return c.json({ error: 'Database URL not configured' }, 500);
  const sql = neon(dbUrl);
  const db = drizzle(sql);
  const existingUserResult = await db.select().from(users).where(eq(users.email, email));
  const existingUser = existingUserResult[0];

  if (existingUser) return c.json({ error: 'User already exists' }, 409);

  const userId = crypto.randomUUID();
  try {
    await db.insert(users).values({
      id: userId,
      email,
      password,
      name,
      role: newUserRole || 'USER',
      domain: domain || null
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
  const dbUrl = c.env.DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) return c.json({ error: 'Database URL not configured' }, 500);
  const sql = neon(dbUrl);
  const db = drizzle(sql);
  const allUsers = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    domain: users.domain,
    password: users.password // Added password field
  }).from(users);
  return c.json(allUsers);
});

// Admin: Delete User
app.delete('/api/users/:id', async (c) => {
  const role = c.get('role');
  if (role !== 'SUPER_ADMIN') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const id = c.req.param('id');
  const dbUrl = c.env.DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) return c.json({ error: 'Database URL not configured' }, 500);
  const sql = neon(dbUrl);
  const db = drizzle(sql);

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
  const { password, email, name, role: userRole, domain } = await c.req.json();

  const updateData: any = {};
  if (password) updateData.password = password;
  if (email) updateData.email = email;
  if (name) updateData.name = name;
  if (userRole) updateData.role = userRole;
  if (domain !== undefined) updateData.domain = domain;

  if (Object.keys(updateData).length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  const dbUrl = c.env.DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) return c.json({ error: 'Database URL not configured' }, 500);
  const sql = neon(dbUrl);
  const db = drizzle(sql);
  try {
    await db.update(users).set(updateData).where(eq(users.id, id));
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Login
app.post('/api/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    const dbUrl = c.env.DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) return c.json({ error: 'Database URL not configured' }, 500);
    const sql = neon(dbUrl);
    const db = drizzle(sql);

    const userResult = await db.select().from(users).where(eq(users.email, email));
    const user = userResult[0];

    if (!user) return c.json({ error: 'Invalid credentials' }, 401);

    if (user.password !== password) return c.json({ error: 'Invalid credentials' }, 401);

    const token = crypto.randomUUID();
    // Valid for session duration (could add expiration)
    await db.insert(sessions).values({
      id: token,
      userId: user.id
    });

    return c.json({ token, email: user.email, name: user.name, role: user.role, domain: user.domain });
  } catch (e: any) {
    console.error('Login Error:', e);
    return c.json({ error: e.message }, 500);
  }
});

// Mount Routes
app.route('/api/proposal-generator', proposalGenerator)
app.route('/api/history', historyRouter)
app.route('/api', resumeRouter)
app.route('/api', jobsRouter)
app.route('/api', proposalRouter)
app.route('/api', criticRouter)

export default app
