import { neon } from '@neondatabase/serverless';

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is missing");
        process.exit(1);
    }
    const sql = neon(process.env.DATABASE_URL);
    try {
        console.log("Fetching resumes...");
        // Get user table too to map names
        const users = await sql`SELECT id, email, role, domain FROM users`;
        const userMap = new Map(users.map(u => [u.id, u.email]));

        const resumes = await sql`SELECT id, user_id, domain, role, created_at FROM resumes ORDER BY created_at DESC LIMIT 20`;

        console.log("Resumes:");
        resumes.forEach(r => {
            console.log({
                id: r.id,
                user: userMap.get(r.user_id) || r.user_id,
                domain: r.domain,
                role: r.role,
                created_at: r.created_at
            });
        });
    } catch (e) {
        console.error("Failed to list resumes:", e);
    }
}

main();
