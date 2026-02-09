import { pgTable, text, timestamp, integer, uuid, vector, jsonb, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    name: text('name').notNull(),
    role: text('role').notNull().default('USER'), // ADMIN | USER
    domainRole: text('domain_role'), // Fullstack, GenAI, AI_ML, DevOps
    domain: text('domain'), // Keep for backward compatibility if needed, or migrate to domainRole
    createdAt: timestamp('created_at').defaultNow(),
});

export const sessions = pgTable('sessions', {
    id: text('id').primaryKey(), // Token
    userId: text('user_id').notNull().references(() => users.id),
    expiresAt: timestamp('expires_at'),
});

export const resumes = pgTable('resumes', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    domain: text('domain').notNull(), // Fullstack, GenAI, AI_ML, DevOps
    role: text('role'), // Role name (for generated resumes)
    description: text('description'), // Original description
    contentChunk: text('content_chunk').notNull(),
    embedding: vector('embedding', { dimensions: 3072 }), // 3072-dim vector from gemini-embedding-001
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const jobs = pgTable('jobs', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    title: text('title'),
    inputType: text('input_type').notNull(), // URL, FILE, TEXT
    inputContent: text('input_content').notNull(),
    domain: text('domain'), // Detected domain
    status: text('status').notNull().default('QUEUED'), // QUEUED, PROCESSING, COMPLETED, REJECTED, PROPOSAL_READY, FINISHED, FAILED
    fitScore: integer('fit_score'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const outputs = pgTable('outputs', {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id').notNull().references(() => jobs.id),
    personaAnalysis: jsonb('persona_analysis'),
    requirementsMatrix: jsonb('requirements_matrix'),
    proposalText: text('proposal_text'),
    refinedProposalText: text('refined_proposal_text'),
    clarifyingQuestions: jsonb('clarifying_questions'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Keeping history for chat if needed, or can be removed/refactored
export const history = pgTable('history', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    fitscore: integer('fitscore'),
    timestamp: timestamp('timestamp').defaultNow(),
});
