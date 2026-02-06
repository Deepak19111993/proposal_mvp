# Domain-Based Proposal Generator - Feature & Deployment Guide

## 🚀 Features Overview

### 1. Domain-Based Proposal Generation
This system ensures that proposals are strictly tailored to the user's specific professional domain.
- **Strict Domain Enforcement**: If a user is registered with a specific domain (e.g., "AI/ML"), the system **will strictly reject** job descriptions from other domains (e.g., "React Frontend").
- **AI Model**: Uses the advanced `gemini-robotics-er-1.5-preview` model for high-quality, context-aware generation.
- **Components**:
    - **Requirement Matrix**: Visual breakdown of job requirements vs. user skills.
    - **Clarifying Questions**: Strategic questions generated for the client.

### 2. Smart Resume Management
- **Strict Creation Logic**: Users can ONLY create resumes that match their assigned domain.
    - *Example*: An "AI/ML" user trying to create a "Fullstack" resume will find it automatically converted to an "AI/ML" resume.
- **Ownership**: The system strictly uses the **User's Own Resumes**. It does not fall back to generic Admin resumes, ensuring personalization.

### 3. Proposal History
- **Save & View**: All generated proposals are saved with their "Fit Score".
- **Delete**: Users can delete their own proposal history.

---

## 🛠️ Deployment Guide

### Backend (Cloudflare Workers)
The backend is built with Hono and deployed to Cloudflare Workers using Wrangler.

**Prerequisites:**
- Cloudflare Account
- `wrangler` CLI installed (`npm install -g wrangler`)
- `wrangler.jsonc` configured with `GEMINI_API_KEY` and `MY_DB` (D1 Database).

**Steps:**
1. **Navigate to Backend:**
   ```bash
   cd backend
   ```
2. **Deploy:**
   ```bash
   npm run deploy
   # OR
   wrangler deploy --minify
   ```
3. **Verify:**
   - The CLI will output a URL, e.g., `https://hono-app.deepak-kushwaha.workers.dev`.
   - Test endpoints like `/api/status` or `/api/login`.

### Frontend (Vercel)
The frontend is a React (Vite) app deployed to Vercel.

**Prerequisites:**
- Vercel Account
- `vercel` CLI installed (`npm install -g vercel`)
- `.env` configured with `VITE_API_URL` pointing to the deployed backend.

**Steps:**
1. **Navigate to Frontend:**
   ```bash
   cd frontend
   ```
2. **Configure Environment:**
   Ensure `.env` (or Vercel Dashboard env vars) has:
   ```
   VITE_API_URL=https://hono-app.deepak-kushwaha.workers.dev/api
   ```
3. **Deploy:**
   ```bash
   npx vercel --prod
   ```
   - Follow the CLI prompts (Link to project? Yes. Settings? Default).
4. **Verify:**
   - Vercel will provide a production URL, e.g., `https://frontend-three-beta-11.vercel.app`.
   - Open the URL and test the Login/Signup flow.

---

## 📂 Project Structure
- **/backend**: Hono API, Drizzle ORM, SQLite (D1), Gemini Integration.
- **/frontend**: React, Tailwind CSS, Shadcn UI, API Client.
- **verify_backend.ts**: (Legacy) Testing scripts for backend logic.
