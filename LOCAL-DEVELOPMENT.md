# Local Development & Testing Guide

## Quick Start for Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create `.env.local` in the project root:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Run Locally
```bash
npm start
```
or
```bash
node server.js
```

The app will start on http://localhost:3000

The local server stores app data in `data/app-state.json`. Vercel stores the same data in Supabase `public.app_state`.

### 4. Test the API
```bash
# Get all app data
curl http://localhost:3000/api/data

# Save all app data
curl -X PUT http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{"data":{"project":[],"modification":[],"testCases":[],"userManagement":[],"assignee":[],"qa":[],"requestor":[],"calendarTasks":[]}}'

# Get all tasks
curl http://localhost:3000/api/tasks

# Create a task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test task","project":"Testing","owner":"Dev","status":"To Do"}'

# Update a task
curl -X PUT http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"id":"task-uuid","status":"In Progress"}'

# Delete a task
curl -X DELETE http://localhost:3000/api/tasks?id=task-uuid
```

## Project Structure

```
├── api/
│   └── tasks.js              # Vercel serverless API handler
├── public/
│   ├── index.html            # Main HTML file
│   ├── script.js             # Frontend logic
│   ├── style.css             # Styling
│   ├── config.js             # Supabase config (frontend)
│   └── supabaseClient.js     # Supabase client wrapper
├── data/
│   └── tasks.json            # Local data (dev only, not in production)
├── server.js                 # Local Node.js server (for development)
├── package.json              # Dependencies & scripts
├── vercel.json               # Vercel configuration
├── supabase-setup.sql        # Database schema
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
├── .vercelignore             # Vercel ignore rules
├── DEPLOYMENT.md             # Detailed deployment guide
└── DEPLOYMENT-CHECKLIST.md   # Quick checklist
```

## Environment Variables

### Local (.env.local - Never commit!)
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_URL`: Your Supabase project URL for server-side API routes
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key for server-side API routes

### Production (Set in Vercel Dashboard)
Same variables as local, but set through Vercel UI.

## Key API Endpoints

The app syncs full directory data through `/api/data`. The older `/api/tasks` route is still available for task-style integrations.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data` | Get all directory-management data |
| PUT | `/api/data` | Save all directory-management data |
| GET | `/api/tasks` | Get all tasks |
| POST | `/api/tasks` | Create new task |
| PUT | `/api/tasks` | Update existing task |
| DELETE | `/api/tasks?id={id}` | Delete a task |

## Before Deploying to Vercel

1. ✅ Ensure `.env.local` is in `.gitignore` (already done)
2. ✅ Test locally with `npm start`
3. ✅ Run SQL schema in Supabase
4. ✅ Push code to Git repository
5. ✅ Set environment variables in Vercel
6. ✅ Deploy!

See `DEPLOYMENT.md` for detailed Vercel deployment instructions.
