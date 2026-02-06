import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    name: text('name').notNull(),
    role: text('role').notNull().default('USER'),
    domain: text('domain'), // Domain for filtering resumes
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const sessions = sqliteTable('sessions', {
    id: text('id').primaryKey(), // Token
    userId: text('user_id').notNull().references(() => users.id),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
});

export const resumes = sqliteTable('resumes', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    role: text('role').notNull(),
    description: text('description').notNull(),
    domain: text('domain'), // Optional domain field
    content: text('content').notNull(),
    timestamp: integer('timestamp', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const history = sqliteTable('history', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    fitscore: integer('fitscore'),
    timestamp: integer('timestamp', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
