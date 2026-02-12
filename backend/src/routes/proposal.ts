import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq, and, gt, sql } from 'drizzle-orm'
import { jobs, outputs, resumes } from '../db/schema.js'
import { Bindings, Variables } from '../types.js'
import { GeminiClient } from '../lib/gemini.js'

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

app.post('/proposal/:jobId', async (c) => {
  const userId = c.get('userId');
  const jobId = c.req.param('jobId');
  const dbUrl = (c.env.DATABASE_URL || process.env.DATABASE_URL) as string;
  const apiKey = (c.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY) as string;

  const neonClient = neon(dbUrl);
  const db = drizzle(neonClient);
  const gemini = new GeminiClient(apiKey);

  try {
    // 1. Fetch Job and Analysis
    const jobResult = await db.select().from(jobs).where(eq(jobs.id, jobId));
    const job = jobResult[0];
    if (!job || job.userId !== userId) return c.json({ error: 'Job not found' }, 404);

    const outputResult = await db.select().from(outputs).where(eq(outputs.jobId, jobId));
    const output = outputResult[0];
    if (!output) return c.json({ error: 'Analysis not found. Run analysis first.' }, 400);

    if (output.proposalText) return c.json({ proposal: output.proposalText });

    // 2. Vector Search for relevant resume chunks
    const jobEmbedding = await gemini.generateEmbedding(job.inputContent);

    // Drizzle doesn't support vector similarity directly in high-level API well without customs
    // We will use raw SQL for the vector search
    const embeddingString = `[${jobEmbedding.join(',')}]`;

    // Find top 7 chunks for this user and domain
    const relevantChunks = await db.execute(sql`
            SELECT content_chunk, (embedding <=> ${embeddingString}::vector) as distance
            FROM resumes
            WHERE user_id = ${userId} AND domain = ${job.domain || 'Fullstack'}
            ORDER BY distance ASC
            LIMIT 7
        `) as any;

    const resumeContext = relevantChunks.rows.map((r: any) => r.content_chunk).join('\n\n');

    // 3. Generate Proposal
    const prompt = `You are an Expert Upwork Freelancer & Strategic Partner.
        
        JOB DESCRIPTION:
        "${job.inputContent}"
        
        CLIENT PERSONA:
        ${JSON.stringify(output.personaAnalysis)}
        
        EXPERT ANALYSIS:
        ${JSON.stringify(output.requirementsMatrix)}
        
        MY RELEVANT EXPERIENCE (RESUME CHUNKS):
        ${resumeContext}
        
        GUIDELINES:
        - **VOICE**: Write in the **FIRST PERSON ("I")**. You ARE the candidate.
        - **TONE**: **Conversational, Direct, Competent, Low-Ego.** Avoid "Corporate Speak".
          - ❌ Bad: "I utilize a synergistic approach."
          - ✅ Good: "I can fix your script in 2 hours."
        - **STRUCTURE**:
          - **Greeting**: Start with a simple "Hi," or "Hello,".
          - **Hook**: Address the specific problem immediately.
          - **Body**: Explain *how* you will solve it using your skills.
          - **Proof**: specific relevant experience.
          - **Closing**: Simple call to action (e.g., "Let's chat?").
          - **Sign-off**: End with "Best," or "Regards,".
        - **PROHIBITIONS**:
          - ❌ NO generic "Dear Hiring Manager".
          - ❌ NO "I am writing to apply".
          - ❌ NO placeholders.
        - **HANDLING MISSING SKILLS**:
          - If the job requires a skill you don't have, **address it honestly**.
          - Say you're happy to learn it, or ask if it's a hard requirement.
          - **Do not lie** about having a skill you don't list.
        
        Format output in Markdown. Start directly with the text.`;

    let proposal = await gemini.generateContent(prompt);

    // Force Greeting
    if (!proposal.match(/^\s*(Hi|Hello|Dear)\b/i)) {
      proposal = "Hi,\n\n" + proposal;
    }

    // Force Sign-off - Check if any sign-off keyword appears anywhere
    const hasSignOff = /(Best|Regards|Sincerely|Thanks|Cheers)[,\s]/i.test(proposal);
    if (!hasSignOff) {
      proposal = proposal.trim() + "\n\nBest";
    }

    // 4. Save and Update Status
    await db.update(outputs).set({ proposalText: proposal }).where(eq(outputs.jobId, jobId));
    await db.update(jobs).set({ status: 'PROPOSAL_READY', updatedAt: new Date() }).where(eq(jobs.id, jobId));

    return c.json({ proposal });

  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

export default app;
