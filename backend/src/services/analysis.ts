import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { jobs, outputs, users } from '../db/schema.js';
import { GeminiClient } from '../lib/gemini.js';
import { analyzePersona } from '../agents/persona.js';
import { routeDomain } from '../agents/router.js';
import { analyzeRequirements } from '../agents/experts.js';
import { scoreFit } from '../agents/scorer.js';
import { RequirementsMatrix } from '../agents/types.js';

export const processJobAnalysis = async (dbUrl: string, jobId: string, apiKey: string) => {
    const sql = neon(dbUrl);
    const db = drizzle(sql);
    const gemini = new GeminiClient(apiKey);

    try {
        // 1. Fetch Job
        const jobResult = await db.select().from(jobs).where(eq(jobs.id, jobId));
        const job = jobResult[0];
        if (!job) throw new Error('Job not found');

        // Update status to PROCESSING
        await db.update(jobs).set({ status: 'PROCESSING', updatedAt: new Date() }).where(eq(jobs.id, jobId));

        // 2. Persona Analysis
        const persona = await analyzePersona(gemini, job.inputContent);

        // 3. Domain Routing
        const routing = await routeDomain(gemini, job.inputContent, persona);

        // 4. Domain Enforcement (Check if user has a specific role)
        const userResult = await db.select().from(users).where(eq(users.id, job.userId));
        const user = userResult[0];

        if (user?.domainRole && user.domainRole !== 'ADMIN' && user.domainRole !== routing.primaryDomain) {
            await db.update(jobs).set({
                status: 'REJECTED',
                domain: routing.primaryDomain,
                updatedAt: new Date()
            }).where(eq(jobs.id, jobId));

            // Still save persona for debugging
            await db.insert(outputs).values({
                jobId: jobId,
                personaAnalysis: persona
            });
            return { rejected: true, reason: 'Domain Mismatch' };
        }

        // 5. Expert Analysis (Parallel)
        const expertResults = await Promise.all([
            analyzeRequirements(gemini, job.inputContent, persona, routing.primaryDomain),
            ...(routing.secondaryDomains.length > 0 && routing.confidence > 0.7
                ? [analyzeRequirements(gemini, job.inputContent, persona, routing.secondaryDomains[0])]
                : [])
        ]);

        // Consolidate Requirements (Simple merge for now)
        const consolidatedMatrix: RequirementsMatrix = {
            explicit: [...new Set(expertResults.flatMap(r => r.explicit))],
            implied: [...new Set(expertResults.flatMap(r => r.implied))],
            constraints: [...new Set(expertResults.flatMap(r => r.constraints))],
            ambiguities: [...new Set(expertResults.flatMap(r => r.ambiguities))],
            risks: [...new Set(expertResults.flatMap(r => r.risks))],
            clarifyingQuestions: expertResults.flatMap(r => r.clarifyingQuestions)
        };

        // 6. Scoring
        const fit = scoreFit(consolidatedMatrix, persona, routing);

        // 7. Save Everything
        await db.update(jobs).set({
            status: fit.route === 'REJECT' ? 'REJECTED' : 'COMPLETED',
            domain: routing.primaryDomain,
            fitScore: fit.score,
            updatedAt: new Date()
        }).where(eq(jobs.id, jobId));

        await db.insert(outputs).values({
            jobId: jobId,
            personaAnalysis: persona,
            requirementsMatrix: consolidatedMatrix,
            clarifyingQuestions: consolidatedMatrix.clarifyingQuestions
        });

        return { success: true, score: fit.score };

    } catch (e: any) {
        console.error(`Analysis Pipeline Failed for Job ${jobId}`, e);
        await db.update(jobs).set({ status: 'FAILED', updatedAt: new Date() }).where(eq(jobs.id, jobId));
        throw e;
    }
};
