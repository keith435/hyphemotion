# Hyphemotion

A CRM built for a small animation studio: sales pipeline, per-project chat, a
dedicated sales team channel, and a revisions tool for collecting timestamped
client feedback on video/image cuts — all backed by a real database so
nothing gets lost the way it does in Discord.

Everything below is free to run for a team of this size. No monthly bill
unless you outgrow the free tiers described here.

## What's inside

- **Sales pipeline** — kanban board (Lead → Contacted → Quoted → Negotiating →
  Won/Lost), drag deals between stages, one click to convert a won deal into
  a project.
- **Projects** — creating a project auto-creates its chat channel and
  revisions tab in the same step (an atomic DB trigger — nothing is ever
  half-created).
- **Project chat** — one channel per project, real-time, file attachments.
- **Sales Team chat** — a separate internal channel only sales + admin can see.
- **Revisions** — upload a video or image version, get timestamped comments
  pinned directly on the video's timeline, mark each round pending / changes
  requested / approved, keep full version history.
- **Roles** — `admin`, `sales`, `production`. Sales pipeline and Sales Team
  chat are hidden from production-only accounts; project data is only
  visible to people assigned to that project (or admins).

## Tech stack (and why it's free)

| Piece | Tool | Free tier |
|---|---|---|
| App framework | Next.js (React) | Open source, free forever |
| Database, auth, real-time, file storage | [Supabase](https://supabase.com) | 500MB DB, 1GB storage, unlimited API calls, up to 50,000 users, free forever (pauses after 7 days idle — one click to resume) |
| Hosting | [Netlify](https://netlify.com) or [Cloudflare Pages](https://pages.cloudflare.com) | Free tier explicitly allows commercial/business use, generous bandwidth for a 9-person internal tool |

You create the Supabase and Netlify/Cloudflare accounts yourself (takes about
5 minutes each) — nothing here requires a credit card.

---

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → sign up (free) → **New project**.
2. Pick any name/region, set a database password (save it somewhere), wait
   ~2 minutes for it to provision.
3. In the left sidebar, open **SQL Editor** → **New query**.
4. Paste the entire contents of `supabase/migrations/0001_init.sql` from
   this project, click **Run**.
5. Repeat step 3–4 with `supabase/migrations/0002_storage.sql`.
6. Go to **Project Settings → API**. Copy the **Project URL** and the
   **anon public** key — you'll need both next.

## 2. Run it locally first

```bash
npm install
cp .env.local.example .env.local
# paste your Project URL and anon key into .env.local
npm run dev
```

Open `http://localhost:3000`, click **Create an account**, sign up with your
work email. Check your email for the confirmation link (Supabase sends this
automatically), then sign in.

### Make yourself admin

New accounts default to the `production` role so nobody accidentally gets
sales/admin access. To promote yourself:

1. In Supabase, go to **Table Editor → profiles**.
2. Find your row, change `role` from `production` to `admin`.
3. Refresh the app — you'll now see the Sales Pipeline and Sales Team Chat
   links in the sidebar.

Do the same for anyone else on your team who needs `sales` or `admin`
access; everyone else can stay `production`.

## 3. Deploy it for the team (Netlify, free)

1. Push this project to a GitHub repo (private is fine).
2. Go to [netlify.com](https://netlify.com) → sign up free → **Add new site
   → Import an existing project** → connect your GitHub repo.
3. Netlify auto-detects Next.js. Before deploying, add your environment
   variables (**Site settings → Environment variables**):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**. You'll get a `*.netlify.app` URL your whole team can use
   — bookmark it, or point a custom domain at it later for free (Netlify
   supports custom domains on the free tier too).

(Cloudflare Pages works the same way if you'd rather use that — connect the
repo, set the same two env vars, deploy.)

## 4. Onboard your team

Send everyone the deployed URL and have them **Create an account**. New
accounts default to `production`; promote sales folks to `sales` and
yourself/co-owners to `admin` in Supabase's Table Editor as above.

---

## Notes on the free tier

- Supabase's free project pauses after 7 days with zero activity. If that
  happens, Supabase shows a "Restore" button in the dashboard — one click,
  back in ~1 minute. A team using this daily will never hit this.
- Free tier caps: 500MB database (plenty — this schema is text/metadata,
  media files live in Storage), 1GB file storage. Revisions video files will
  be what fills this fastest; when you outgrow 1GB, Supabase's next tier is
  $25/mo and raises storage substantially, or you can offload old approved
  projects' files externally.
- If your team is fully remote and mostly async, this is a fair Discord
  replacement for chat + gives you the revisions/CRM tracking Discord never
  had.

## What's deliberately not built yet

This is a working v1 covering the three priorities you flagged: project +
revisions tracking, sales pipeline, and chat. Reasonable next additions:
client login access (currently internal-team only), email notifications for
new comments/mentions, search across projects/messages, and file size
limits/compression for large video uploads. Happy to build any of these next
— just say which matters most.
