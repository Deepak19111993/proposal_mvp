import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: text('id').primaryKey(), // Keeping text for GUIDs
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    name: text('name').notNull(),
    role: text('role').notNull().default('USER'),
    domain: text('domain'), // Domain for filtering resumes
    createdAt: timestamp('created_at').defaultNow(),
});

export const sessions = pgTable('sessions', {
    id: text('id').primaryKey(), // Token
    userId: text('user_id').notNull().references(() => users.id),
    expiresAt: timestamp('expires_at'),
});

export const resumes = pgTable('resumes', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    role: text('role').notNull(),
    description: text('description').notNull(),
    domain: text('domain'), // Optional domain field
    content: text('content').notNull(),
    timestamp: timestamp('timestamp').defaultNow(),
});

export const history = pgTable('history', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    fitscore: integer('fitscore'),
    timestamp: timestamp('timestamp').defaultNow(),
});
