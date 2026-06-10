# Vercel & Supabase Deployment Checklist

## Pre-Deployment Checklist

### Supabase Setup
- [ ] Create a Supabase project at https://supabase.com
- [ ] Run the SQL schema from `supabase-setup.sql` in your Supabase SQL editor
- [ ] Copy your Supabase Project URL (Settings → API → Project URL)
- [ ] Copy your Supabase Anon Key (Settings → API → Anon public)
- [ ] Verify RLS policies are enabled and configured correctly

### Local Testing
- [ ] Run `npm install @supabase/supabase-js`
- [ ] Create `.env.local` file with Supabase credentials
- [ ] Test API routes locally: `node server.js`
- [ ] Verify all CRUD operations work locally

### Git Repository
- [ ] Initialize git if not already done: `git init`
- [ ] Add `.gitignore` (already created)
- [ ] Commit all files: `git add . && git commit -m "Ready for Vercel deployment"`
- [ ] Push to GitHub, GitLab, or Bitbucket

### Vercel Deployment
- [ ] Create account at https://vercel.com
- [ ] Click "New Project" and select your Git repository
- [ ] Set Build Command: `npm run vercel-build`
- [ ] Set Output Directory: `public`
- [ ] Add Environment Variables:
  - `VITE_SUPABASE_URL`: Your Supabase URL
  - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key
  - `SUPABASE_URL`: Your Supabase URL
  - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key
- [ ] Click "Deploy"
- [ ] Wait for deployment to complete

### Post-Deployment Testing
- [ ] Visit your Vercel deployment URL
- [ ] Test Create operation (add a new record)
- [ ] Test Read operation (view records)
- [ ] Test Update operation (modify a record)
- [ ] Test Delete operation (remove a record)
- [ ] Check Supabase dashboard → `app_state` table to verify data persistence
- [ ] Open the deployed app on another computer/browser and confirm changes appear within a few seconds
- [ ] Open browser console (F12) to check for errors

## Important Files

- **vercel.json** - Vercel configuration with API routes
- **.env.example** - Template for environment variables (never commit .env)
- **api/data.js** - Serverless API handler for the full app data sync
- **api/tasks.js** - Serverless API handler for Supabase operations
- **DEPLOYMENT.md** - Detailed deployment guide
- **.gitignore** - Prevents committing sensitive files

## Environment Variables Format

**For Vercel Dashboard, use these names exactly:**
- `VITE_SUPABASE_URL` = `https://your-project-id.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `eyJ0eXAiOiJKV1QiLCJhbGc...` (starts with eyJ)
- `SUPABASE_URL` = `https://your-project-id.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = your service role key (server-side only)

## Troubleshooting

If deployment fails:
1. Check Vercel logs (Deployments tab)
2. Verify environment variables are set
3. Ensure API route files exist at `/api/data.js` and `/api/tasks.js`
4. Run `npm install` locally and test first

If API calls fail after deployment:
1. Open browser DevTools (F12)
2. Check Network tab for API requests
3. Check Console for error messages
4. Verify Supabase credentials in .env variables

## Support Resources

- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Supabase JS Client: https://supabase.com/docs/reference/javascript
