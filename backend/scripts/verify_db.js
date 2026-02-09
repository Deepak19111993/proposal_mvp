import { neon } from '@neondatabase/serverless';

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is missing");
        process.exit(1);
    }
    const sql = neon(process.env.DATABASE_URL);
    try {
        console.log("Checking tables...");
        const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        console.log("Tables:", tables.map(t => t.table_name));

        console.log("Checking resumes columns...");
        const columns = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'resumes'`;
        console.log("Resumes Columns:", columns);
    } catch (e) {
        console.error("Verification failed:", e);
    }
}

main();
