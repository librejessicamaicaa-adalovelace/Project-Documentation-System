# Shared Project Task Tracker

A simple project task tracker that stores shared tasks in Supabase instead of browser local storage.

## Supabase Setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Paste and run `supabase-setup.sql`.
4. Open Supabase Project Settings > API.
5. Copy the Project URL and anon public key.
6. Update `public/config.js`:

```js
window.SUPABASE_CONFIG = {
  url: "https://your-project.supabase.co",
  anonKey: "your-anon-public-key"
};
```

## Run Locally

```powershell
npm start
```

Open:

```text
http://localhost:3000
```

## Publish

You can publish the `public` folder on Vercel as a static app after `public/config.js` has your Supabase values.

## Notes

- Shared tasks are saved in Supabase table `tasks`.
- Attachments are saved in the public Supabase Storage bucket `task-attachments`.
- The provided SQL allows public read/create/update/delete for anyone who can open the app URL.
- The provided SQL allows public attachment upload/read/delete for anyone who can open the app URL.
- Add Supabase Auth and stricter Row Level Security policies before sharing sensitive work.
- To use a different port:

```powershell
$env:PORT=4000; npm start
```
