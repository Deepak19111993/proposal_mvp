import { neon } from '@neondatabase/serverless';

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is missing");
        process.exit(1);
    }
    const sql = neon(process.env.DATABASE_URL);
    try {
        console.log("Fetching users...");
        const users = await sql`SELECT email, password, role, domain FROM users LIMIT 5`;
        console.log("Users:", users);
    } catch (e) {
        console.error("Failed to list users:", e);
    }
}

main();
