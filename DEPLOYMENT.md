# Deployment Guide: Vercel & Supabase

This guide walks you through deploying your Project Management application to Vercel with Supabase as the backend.

## Prerequisites

- [Vercel account](https://vercel.com/signup)
- [Supabase project](https://supabase.com) already created
- Git repository (push your code to GitHub, GitLab, or Bitbucket)
- Node.js 18+ installed locally

## Step 1: Prepare Supabase Database

1. **Run the SQL schema** in your Supabase project:
   - Go to your Supabase project dashboard
   - Navigate to "SQL Editor"
   - Create a new query and paste the contents of `supabase-setup.sql`
   - Execute the query
   - Verify the `app_state` table was created with proper RLS policies

2. **Get your Supabase credentials**:
   - Go to Project Settings → API
   - Copy your **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - Copy your **Anon Public Key** (starts with `eyJ...`)
   - Optionally copy your **Service Role Key** for server-side operations

## Step 2: Set Up Environment Variables

### Local Development

Create a `.env.local` file in your project root:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### Production (Vercel)

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add the following variables for **Production**:
   - `VITE_SUPABASE_URL`: Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key
   - `SUPABASE_URL`: Your Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key

`VITE_*` values are public browser configuration. `SUPABASE_SERVICE_ROLE_KEY` is used only by Vercel serverless functions and must never be added to frontend files.

## Step 3: Deploy to Vercel

### Option A: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Select your Git repository (GitHub, GitLab, Bitbucket)
4. Choose this repository
5. In project settings:
   - Build Command: `npm run vercel-build`
   - Output Directory: `public`
   - Environment Variables: Add your Supabase credentials (see Step 2)
6. Click "Deploy"

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Link to existing project (if redeploying)
vercel link

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy again
vercel
```

## Step 4: Frontend Configuration

Do not hard-code Supabase credentials in `public/config.js`. During `npm run vercel-build`, `scripts/generate-config.js` writes `public/config.js` from Vercel environment variables.

For local testing, create `.env.local` and run:

```bash
npm run build
npm start
```

## Step 5: Test Your Deployment

1. Visit your Vercel deployment URL (e.g., `https://your-project.vercel.app`)
2. Test all CRUD operations (Create, Read, Update, Delete)
3. Verify data persists in Supabase (check the `app_state` table)
4. Open the app in two browsers or computers, edit a record in one, and confirm the other updates within a few seconds
5. Check browser console for any errors

## Troubleshooting

### "Cannot find module @supabase/supabase-js"

Run: `npm install @supabase/supabase-js`

### API endpoints returning 404

Make sure your API route files are in the `/api` folder:
- `/api/data.js` should be accessible at `/api/data`
- `/api/tasks.js` should be accessible at `/api/tasks`

### Environment variables not working

1. Verify variables are set in Vercel project settings
2. Redeploy after adding variables: `vercel deploy --prod`
3. Check variable names match exactly in code
4. Confirm the build log includes `Generated public/config.js from environment variables.`

### CORS errors

Update your Supabase project's CORS settings:
1. Go to Project Settings → API
2. Add your Vercel deployment URL to CORS allowed origins

### Supabase row-level security (RLS) blocking requests

Check that your RLS policies are correctly configured:
1. In Supabase, go to Authentication → Policies
2. Ensure "Public can read tasks" and "Public can create tasks" policies are enabled
3. For authenticated users, configure user-specific policies as needed

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.local` locally and set variables in Vercel dashboard
2. **Rotate keys if exposed** - If credentials appear in git history, regenerate them in Supabase
3. **Use Row Level Security (RLS)** - Supabase setup.sql already includes RLS policies
4. **Limit API access** - Consider adding authentication/authorization as your app grows
5. **Use Supabase Auth** - For user-specific data, implement Supabase Auth

## Next Steps

1. Set up a custom domain in Vercel
2. Configure DNS and SSL certificates
3. Set up automatic deployments from your Git repository
4. Monitor logs in Vercel dashboard
5. Consider adding Supabase authentication for user-specific data

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/installing)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
