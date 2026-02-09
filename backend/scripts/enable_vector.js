import { neon } from '@neondatabase/serverless';


async function main() {
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is missing");
        process.exit(1);
    }
    const sql = neon(process.env.DATABASE_URL);
    try {
        console.log("Enabling vector extension...");
        await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
        console.log("Vector extension enabled successfully.");
    } catch (e) {
        console.error("Failed to enable vector extension:", e);
    }
}

main();
