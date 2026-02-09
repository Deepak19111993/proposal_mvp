import { serve } from '@hono/node-server'
// Force Rebuild 2
import app from '../src/index.js'

export const config = {
    runtime: 'nodejs'
}

export default app

// For local testing or if Vercel picks up the server directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const port = 3000
    console.log(`Server is running on port ${port}`)
    serve({
        fetch: app.fetch,
        port
    })
}
