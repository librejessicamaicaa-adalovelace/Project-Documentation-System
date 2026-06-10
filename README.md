# Project Testing Management App

Shared project management dashboard for Project Modification, Test Case Management, Task Calendar Activities, and directory records.

The app stores the full shared state in Supabase through Vercel serverless API routes. Each browser also keeps a local copy for fallback, and the frontend polls the shared API every few seconds so other users and other computers see updates without a manual reload.

## Local Setup

1. Install dependencies:

```powershell
npm install
```

2. Copy `.env.example` to `.env.local` and fill in your Supabase values:

```powershell
Copy-Item .env.example .env.local
```

3. Generate frontend config and start the local server:

```powershell
npm run build
npm start
```

4. Open:

```text
http://localhost:3000
```

## Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Paste and run `supabase-setup.sql`.
4. Confirm the `app_state` table exists.
5. In Project Settings > API, copy:
   - Project URL
   - anon public key
   - service role key

The service role key is used only by `/api/data` and `/api/tasks` on the server side. Do not put it in frontend files.

## Vercel Setup

Set these environment variables in Vercel:

```text
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Use these Vercel settings:

```text
Build Command: npm run vercel-build
Output Directory: public
```

## GitHub Publish

```powershell
git init
git add .
git commit -m "Ready for Vercel Supabase deployment"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

Do not commit `.env`, `.env.local`, `node_modules`, or local files in `data/`.

## Verification

Run:

```powershell
npm run check
```

After deploying, open the Vercel URL on two computers or two browsers. Add or edit a record in one browser. The other browser should refresh the shared data within a few seconds.
