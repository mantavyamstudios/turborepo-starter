# turborepo-starter — Setup Guide

A reusable starter for new projects, built on
[vercel/next-forge](https://github.com/vercel/next-forge) (Turborepo + Next.js
16 + React 19 + Prisma 7 + shadcn/ui) with a few changes so the **whole
monorepo runs locally without any API keys**. Every third-party integration
stays disabled until its key is added.

Repository: https://github.com/mantavyamstudios/turborepo-starter

**Contents**

0. [Prerequisites — read first (macOS / Windows)](#0-prerequisites--read-first-macos--windows)
1. [Path A — Test it as-is (no keys)](#1-path-a--test-it-as-is-no-keys-10-minutes)
2. [Path B — Production foundation (every integration wired or removed)](#2-path-b--production-foundation-every-integration-wired-or-removed)
3. [How env files work](#3-how-env-files-work)
4. [Integration checklist](#4-integration-checklist) — one section per service
5. [Environment reference](#5-environment-reference) — every variable, exact format
6. [Deploying](#6-deploying)
7. [Upstream: history, updates and why it is set up this way](#7-upstream-history-updates-and-why-it-is-set-up-this-way)
8. [Changes from upstream next-forge](#8-changes-from-upstream-next-forge)
9. [Known issues](#9-known-issues)
10. [Verification checklist](#10-verification-checklist)

Find every place that needs attention when wiring keys with:

```sh
grep -rn "TODO(setup)" --include='*.ts' --include='*.tsx' --include='.env.example' apps packages
```

---

## 0. Prerequisites — read first (macOS / Windows)

Complete this once per machine before Path A or Path B.

### Hardware and ports

- 8 GB RAM minimum (16 GB recommended): `dev` runs 7 servers at once
- ~5 GB free disk (dependencies, Next.js caches, browsers)
- Ports **3000–3005** and **6006** free. Check with `lsof -i :3000` (macOS) or
  `netstat -ano | findstr :3000` (Windows)

### Required software

| Tool | Version | Used for |
| --- | --- | --- |
| Git | any recent | Clone, upstream merges |
| Node.js | 20+ (LTS) | Tooling (Prisma, Mintlify, Storybook) |
| Bun | 1.3+ | Package manager and script runner (pinned by the repo) |
| PostgreSQL | 15+ | Local database |
| Mintlify CLI | latest | `apps/docs` dev server |
| Stripe CLI | latest, **optional** | Local Stripe webhooks (Path B) |
| Modern browser | Chrome / Edge / Firefox / Safari | Testing |

### macOS

```sh
# 1. Command line tools (git, compilers)
xcode-select --install

# 2. Homebrew (skip if `brew -v` works)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 3. Tools
brew install node oven-sh/bun/bun postgresql@15
brew services start postgresql@15
npm i -g mintlify
brew install stripe/stripe-cli/stripe        # optional

# 4. Make Postgres CLI tools available (Apple Silicon path shown)
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

Homebrew Postgres creates a superuser named after your macOS user with no
password, which matches the `setup:local` default URL
`postgresql://$(whoami)@localhost:5432/next_forge`.

### Windows

The setup script is Bash. **Use WSL2 (recommended)** or Git Bash. Native
Windows is **not tested**; WSL2 behaves like Linux and avoids path, shell and
file-watching issues.

**Option 1 — WSL2 (recommended)**

```powershell
# PowerShell as Administrator, then reboot
wsl --install -d Ubuntu
```

Inside the Ubuntu terminal:

```sh
sudo apt update && sudo apt install -y git curl unzip postgresql postgresql-contrib
sudo service postgresql start
# Postgres role matching your Linux user, so the default setup URL works
sudo -u postgres createuser -s "$(whoami)"

# Node 20+ via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc && nvm install --lts

# Bun
curl -fsSL https://bun.sh/install | bash && source ~/.bashrc

npm i -g mintlify
```

Keep the repo **inside the Linux filesystem** (e.g. `~/code/`), not under
`/mnt/c/`, or hot reload and installs become very slow. Browse to
`http://localhost:3000` etc. from Windows as usual. WSL2 forwards the ports.
Run `sudo service postgresql start` after each reboot.

**Option 2 — Native Windows with Git Bash (untested)**

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
powershell -c "irm bun.sh/install.ps1 | iex"
# PostgreSQL: installer from https://www.postgresql.org/download/windows/
# (remember the password you set for the `postgres` user; add its bin\ folder to PATH)
npm i -g mintlify
```

Then, in **Git Bash**, create the database and pass an explicit URL, because
the Windows installer uses a `postgres` user with a password:

```sh
createdb -U postgres next_forge
DATABASE_URL="postgresql://postgres:<password>@localhost:5432/next_forge" bun run setup:local
```

### Verify prerequisites

```sh
git --version
node -v          # v20 or newer
bun -v           # 1.3 or newer
pg_isready       # "accepting connections"
psql -d postgres -c "select 1"   # Windows native: add -U postgres
mintlify --version
```

All of these must succeed before continuing.

---

## 1. Path A — Test it as-is (no keys, ~10 minutes)

For evaluating the starter before committing to it. Nothing needs an account
or API key.

### Step 1 — Check prerequisites

Finish [§0](#0-prerequisites--read-first-macos--windows) and run its **Verify prerequisites** commands.

### Step 2 — Clone

```sh
git clone https://github.com/mantavyamstudios/turborepo-starter.git
cd turborepo-starter
```

### Step 3 — Bootstrap

```sh
bun run setup:local
```

This creates each env file from its `.env.example` with empty keys commented
out (an empty string fails format validation such as `startsWith("sk_")`). It
points `DATABASE_URL` at `postgresql://$(whoami)@localhost:5432/next_forge`,
creates that database, installs dependencies and applies migrations. Existing
env files are never overwritten. Override with `DB_NAME=my_db` or
`DATABASE_URL=postgresql://...`.

Expect: `All migrations have been successfully applied.` and `Done.`

### Step 4 — Run everything

```sh
bun run dev:local
```

`dev:local` = `turbo dev --continue --filter=!@repo/cms`:

- `--filter=!@repo/cms` skips the BaseHub type watcher (`basehub dev`), which
  exits without `BASEHUB_TOKEN`.
- `--continue` keeps other apps running when one task fails (e.g.
  `stripe listen` in `apps/api` without the Stripe CLI; the
  `[stripe] ... exited with code 127` line is expected).

Wait for four `✓ Ready in` lines plus `Storybook ready!`.

### Step 5 — Walk through each app

| # | Open | Expect |
| --- | --- | --- |
| 1 | http://localhost:3001/en | Marketing home: hero, features, nav menu opens |
| 2 | http://localhost:3001/en/pricing, `/en/contact` | Pages render |
| 3 | http://localhost:3001/en/blog | "CMS content unavailable — BASEHUB_TOKEN not configured" |
| 4 | http://localhost:3002/health | `OK` |
| 5 | http://localhost:3003 | Email template previews (e.g. *contact*) |
| 6 | http://localhost:3004 | Mintlify docs (sample content) |
| 7 | http://localhost:3005 | Prisma Studio → `Page` table |
| 8 | http://localhost:6006 | Storybook → design-system components |
| 9 | http://localhost:3000 | Redirects to `/sign-in` (Clerk **keyless** mode, "Configure your application" popup) |
| 10 | http://localhost:3000/sign-up | Sign up with any email you can receive, or `yourname+clerk_test@example.com` with code `424242` (Clerk dev test address); pass the "Verify you are human" check |
| 11 | Sidebar → organization switcher → *Create organization* | Dashboard renders (empty until you add `Page` rows, e.g. via Prisma Studio) |
| 12 | Search box → `/search?q=...` | Results grid |
| 13 | Sidebar → *Webhooks* | "Webhooks not configured" empty state |

Before step 11 the dashboard says "No organization selected". That's expected.

### Step 6 — What is expected (not bugs) in Path A

- **Hydration warning** in the browser console on pages with menus/dialogs.
  It comes from Clerk keyless mode and goes away with Clerk keys
  ([§9](#9-known-issues)).
- A `401` in the console on `/sign-in` (Clerk handshake).
- `http://localhost:3001/` (no locale) returns 404. Use `/en`.
- Sidebar entries other than *Webhooks* are `#` placeholders.
- Integrations (payments, notifications, live cursors, analytics…) are silent no-ops.

### Step 7 — Stop and clean up

`Ctrl+C` stops all apps. To remove everything: delete the folder, then
`dropdb next_forge`.

---

## 2. Path B — Production foundation (every integration wired or removed)

Use this when the starter becomes the base of a real SaaS. **Goal state: zero
exceptions.** Every integration is either fully wired with validated keys or
deleted from the codebase. Nothing is left in an "optional, silently disabled"
state, and a missing key fails the build instead of silently switching
a feature off.

### Step 1 — Create the project with shared history

```sh
git clone https://github.com/mantavyamstudios/turborepo-starter.git my-saas
cd my-saas
git remote rename origin starter                               # this starter (read-only)
git remote add upstream https://github.com/vercel/next-forge.git  # next-forge (read-only)
git fetch upstream --tags
# create an EMPTY repo on GitHub (no README/license), then:
git remote add origin https://github.com/<org>/my-saas.git
git push -u origin main
```

Don't use GitHub's **Fork** (a fork of a public repo must stay public) or
**Use this template** (unrelated single-commit history, painful upstream
merges). See [§7](#7-upstream-history-updates-and-why-it-is-set-up-this-way).

### Step 2 — Confirm it runs untouched

Run Path A steps 3–5 in the new repo. Fix environment problems now, before
changing any code.

### Step 3 — Decide the integration inventory

For **each** row, decide *Keep* or *Remove*, and record the decision (e.g. in
your project README):

| Integration | Package / app | Keep → wire in §4 | Remove → delete |
| --- | --- | --- | --- |
| Clerk (auth) | `packages/auth` | [Clerk](#clerk) | Replace with another provider (see `docs/content/docs/migrations/authentication/`) |
| Postgres / Neon | `packages/database` | [Database](#database) | — (required) |
| BaseHub (CMS) | `packages/cms` | [BaseHub](#basehub) | Delete `packages/cms`, blog/legal pages in `apps/web` |
| Stripe | `packages/payments` | [Stripe](#stripe) | Delete package, `apps/api/app/webhooks/payments`, `stripe` script in `apps/api/package.json` |
| Resend | `packages/email` | [Resend](#resend) | Delete package, contact form action |
| Svix | `packages/webhooks` | [Svix](#svix) | Delete package, `apps/app/.../webhooks`, sidebar entry |
| Liveblocks | `packages/collaboration` | [Liveblocks](#liveblocks) | Delete package, avatar/cursor components, `apps/app/app/api/collaboration` |
| Knock | `packages/notifications` | [Knock](#knock) | Delete package, provider + trigger in `apps/app` |
| PostHog / GA | `packages/analytics` | [PostHog](#posthog), [GA](#google-analytics) | Remove the provider and `/ingest` rewrites in `packages/next-config` |
| Arcjet | `packages/security` | [Arcjet](#arcjet) | Remove `secure()` calls (keep `nosecone` headers) |
| Feature flags | `packages/feature-flags` | [Feature flags](#feature-flags) | Delete package and toolbar |
| BetterStack / Sentry | `packages/observability` | [BetterStack](#betterstack), [Sentry](#sentry) | Strip the unused half |
| Upstash | `packages/rate-limit` | [Upstash](#upstash) | Delete package |
| Vercel Blob | `packages/storage` | [Vercel Blob](#vercel-blob) | Delete package |
| OpenAI | `packages/ai` | [OpenAI](#openai) | Delete package |
| Languine | `packages/internationalization` | [Languine](#languine) | Keep i18n, drop the `translate` script |
| Storybook / Docs / Email / Studio apps | `apps/*` | keep | Delete the app folder |

When removing: delete the package, drop it from every `apps/*/env.ts`
`extends`, remove its `@repo/<name>` dependency lines, then run `bun install`
and `bun run build` until it's green. Search for leftovers with
`grep -rn "@repo/<name>" apps packages`.

### Step 4 — Create accounts per environment

Use **separate** credentials per environment. Never reuse production keys locally.

| Environment | Clerk | Stripe | Database | Others |
| --- | --- | --- | --- | --- |
| development | Development instance (`pk_test_`/`sk_test_`) | Test mode (`sk_test_`) | Local Postgres or Neon dev branch | Dev/test projects |
| staging | Separate dev instance or prod-like | Test mode | Neon `staging` branch | Staging projects |
| production | Production instance (`pk_live_`/`sk_live_`) | Live mode (`sk_live_`) | Neon `main` branch | Production projects |

### Step 5 — Wire every kept integration (local first)

Work through the [integration checklist](#4-integration-checklist) **in this
order**. Each step unblocks the next:

1. [Database](#database) (Neon dev branch or local)
2. [Clerk](#clerk). This removes keyless mode: delete `apps/*/.clerk/`, restart,
   and confirm the hydration warning is gone
3. [URLs](#urls)
4. [Resend](#resend) → [Stripe](#stripe) → [Svix](#svix)
5. [BaseHub](#basehub). After this, `bun run dev` works (the CMS watcher no longer exits)
6. [Liveblocks](#liveblocks), [Knock](#knock)
7. [PostHog](#posthog), [Google Analytics](#google-analytics), [BetterStack](#betterstack), [Sentry](#sentry)
8. [Arcjet](#arcjet), [Feature flags](#feature-flags), [Upstash](#upstash)
9. [Vercel Blob](#vercel-blob), [OpenAI](#openai), [Languine](#languine) if kept

After each one: restart the dev server, run its **Verify** step, then tick it
off.

### Step 6 — Make validation strict (no silent fallbacks)

Upstream marks every integration key `.optional()` so the app boots without
them. For kept integrations, make the keys **required** so a missing or
malformed key fails at build/boot:

```diff
 // packages/payments/keys.ts
-      STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
-      STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
+      STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
+      STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
```

Do this for every kept package's `keys.ts` and delete its `// TODO(setup)`
line. Then:

- [ ] Remove the no-key branches that are now unreachable, e.g. the
      `if (!keys().SVIX_TOKEN)` block in `apps/app/app/(authenticated)/webhooks/page.tsx`
      and the `BASEHUB_TOKEN` guards in `packages/cms/components/{toolbar,feed}.tsx`
      (optional, harmless if left)
- [ ] Never set `SKIP_ENV_VALIDATION` in any environment (see [§3](#3-how-env-files-work))
- [ ] Switch from `bun run dev:local` to `bun run dev`. It must start with no
      failing task. If `stripe listen` fails, run `stripe login`
- [ ] Keep `packages/database/index.ts`'s localhost `pg` adapter (dev only,
      production URLs use Neon), or remove it along with `bunfig.toml` hoisting
      and `@prisma/adapter-pg` if the team always develops against Neon

### Step 7 — Replace starter scaffolding

- [ ] `package.json` → `name`; decide whether to keep `"private": true` (keep it
      unless you publish to npm)
- [ ] Branding: search `Acme Inc` / `next-forge` in `apps/`
- [ ] Database: replace the stub `Page` model, delete
      `packages/database/prisma/migrations/`, run `bun run migrate` to create your
      initial migration
- [ ] Replace sidebar `#` placeholders, `apps/docs` sample content, and marketing copy
- [ ] Optional: delete upstream-only material (`scripts/` CLI, `docs/` site,
      `.github/workflows/release.yml`) once you no longer need it as reference

### Step 8 — Configure deployment secrets

- [ ] Add every variable from [§5](#5-environment-reference) that your kept
      integrations need to each deployed app, per environment (Vercel project
      env vars, Google Secret Manager, Doppler, etc.). Never commit them
- [ ] Production URLs: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WEB_URL`,
      `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DOCS_URL`, `VERCEL_PROJECT_PRODUCTION_URL`
- [ ] Re-point webhooks to production domains: Clerk → `/webhooks/auth`,
      Stripe → `/webhooks/payments` (both on the API host), Svix endpoints
- [ ] CI: `bun install --frozen-lockfile && bun run check && bun run build`, plus
      `bun run migrate:deploy` against the target database before deploying
- [ ] See [§6](#6-deploying) for Vercel vs Docker specifics

### Step 9 — Final "no exceptions" audit

All of these must be true before the first production deploy:

- [ ] `grep -rn "TODO(setup)" apps packages` → **no results**
- [ ] `grep -rn "\.optional()" packages/*/keys.ts` → only genuinely optional
      values remain (e.g. `NEXT_PUBLIC_DOCS_URL`, Vercel-injected vars), each
      with a reason you can state
- [ ] No `.env*` files tracked: `git ls-files | grep -E "\.env(\.local)?$"` → empty
- [ ] `apps/*/.clerk/` absent (keyless mode fully retired)
- [ ] `bun run dev` starts every app with no failing task and no console errors
      on the pages in [§10](#10-verification-checklist)
- [ ] `bun run build` passes with production env values
- [ ] Each kept integration's **Verify** step from §4 passes in staging
- [ ] Production and development credentials are different for every service

## 3. How env files work

- Each package validates its own variables in `packages/<name>/keys.ts` using
  [`@t3-oss/env-nextjs`](https://env.t3.gg) + Zod.
- Each app composes the packages it uses in `apps/<app>/env.ts` (`extends:
  [...]`). An app only reads variables of packages it extends.
- Next.js loads `.env.local` **per app**, so shared keys (e.g. Clerk) must be
  **repeated** in every app that uses them.
- Empty strings are *not* "unset": `KEY=""` fails validators like
  `startsWith("sk_")`. Comment unused keys out instead.
- Don't use `SKIP_ENV_VALIDATION=true` as a workaround. When set,
  t3-env returns only the top-level `runtimeEnv` and drops everything from
  `extends`, so every composed variable becomes `undefined`.
- Prisma CLI reads `packages/database/.env` (loaded in `prisma.config.ts`).
- Env files are gitignored. Never commit them. Clerk keyless files
  (`apps/*/.clerk/`) are gitignored too.

| File | Read by | Contains |
| --- | --- | --- |
| `apps/app/.env.local` | Main app | auth, database, email, analytics, collaboration, notifications, webhooks, flags, security, observability, URLs |
| `apps/web/.env.local` | Marketing site | auth (provider only), CMS, email, flags, rate-limit, security, observability, URLs |
| `apps/api/.env.local` | API | auth (webhook secret), database, email, payments, analytics, observability, URLs |
| `packages/database/.env` | Prisma CLI, Studio | `DATABASE_URL` |
| `packages/cms/.env.local` | `basehub` CLI | `BASEHUB_TOKEN` |
| `packages/internationalization/.env.local` | `languine` CLI | `LANGUINE_PROJECT_ID` |

App ↔ package mapping (from each `apps/*/env.ts`):

| Package keys | app | web | api |
| --- | :-: | :-: | :-: |
| analytics | ✅ | | ✅ |
| auth | ✅ | (provider) | ✅ |
| cms | | ✅ | |
| collaboration | ✅ | | |
| database | ✅ | | ✅ |
| email | ✅ | ✅ | ✅ |
| feature-flags | ✅ | ✅ | |
| next-config (URLs) | ✅ | ✅ | ✅ |
| notifications | ✅ | | |
| observability | ✅ | ✅ | ✅ |
| payments | | | ✅ |
| rate-limit | | ✅ | |
| security | ✅ | ✅ | |
| webhooks | ✅ | | |
| ai, storage | not extended by any app — add to `env.ts` when you use them |

---

## 4. Integration checklist

Tick each one as you wire it. Every section lists where to get the value, where
to put it, and how to check it works.

### Database

Required. Local Postgres for development, [Neon](https://console.neon.tech) for
staging/production.

- [ ] Local: `DATABASE_URL="postgresql://<user>@localhost:5432/next_forge"` (set by `setup:local`)
- [ ] Neon: Console → project → **Connection string** (pooled). Format:
      `postgresql://<user>:<pw>@<host>.neon.tech/<db>?sslmode=require`
- [ ] Put it in `packages/database/.env`, `apps/app/.env.local`, `apps/api/.env.local`
      (and `apps/web/.env.local` if the site queries the DB)
- [ ] Apply migrations: `bun run migrate:deploy` (dev: `bun run migrate`)
- [ ] Verify: http://localhost:3005 (Prisma Studio) lists tables

Localhost URLs use `@prisma/adapter-pg`. Every other URL uses `PrismaNeon`
(`packages/database/index.ts`).

### Clerk

Authentication, users, organizations. **Set this first**: it removes keyless
mode and its hydration warnings.

- [ ] https://dashboard.clerk.com → create application → **API Keys**
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."`, `CLERK_SECRET_KEY="sk_test_..."`
- [ ] Put the **same** values in `apps/app`, `apps/web` and `apps/api` `.env.local`
- [ ] Keep `NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"`, `..._SIGN_UP_URL="/sign-up"`,
      `..._AFTER_SIGN_IN_URL="/"`, `..._AFTER_SIGN_UP_URL="/"`
- [ ] Enable **Organizations** (dashboard → Organizations): the dashboard needs an active org
- [ ] Webhook (optional, for syncing users): dashboard → **Webhooks** → endpoint
      `https://<api-host>/webhooks/auth` → copy signing secret →
      `CLERK_WEBHOOK_SECRET="whsec_..."` in `apps/api/.env.local`
- [ ] Delete `apps/app/.clerk` and `apps/web/.clerk` (keyless leftovers)
- [ ] Verify: sign up at http://localhost:3000/sign-up, create an org, dashboard
      renders with no hydration warning in the console

Keyless mode: without keys, Clerk creates a temporary dev app per Next app
(`apps/<app>/.clerk/.tmp/keyless.json`, including a `claimUrl` to adopt it).
`apps/app` and `apps/web` get **different** keyless apps, so sessions aren't
shared between them until real keys are set.

### BaseHub

CMS for the marketing blog and legal pages.

- [ ] Fork https://basehub.com/basehub/next-forge?fork=1 (the schema must match `packages/cms`)
- [ ] BaseHub → **Settings → API Tokens** (or "Connect to your App") → Read Token
- [ ] `BASEHUB_TOKEN="bshb_pk_..."` in `apps/web/.env.local` **and** `packages/cms/.env.local`
- [ ] Verify: http://localhost:3001/en/blog lists posts; toolbar appears. You can now
      use `bun run dev` (the CMS watcher no longer exits)

### Stripe

Payments and subscriptions (webhooks handled by `apps/api`).

- [ ] https://dashboard.stripe.com/test/apikeys → `STRIPE_SECRET_KEY="sk_test_..."`
- [ ] Local webhooks: `stripe login`, then `bun run dev` starts
      `stripe listen --forward-to localhost:3002/webhooks/payments`. Copy the
      printed `whsec_...` → `STRIPE_WEBHOOK_SECRET`
- [ ] Production: dashboard → **Developers → Webhooks** → endpoint
      `https://<api-host>/webhooks/payments` → signing secret
- [ ] Put both in `apps/api/.env.local`
- [ ] Verify: `stripe trigger checkout.session.completed` → api log shows handling, not "Not configured"

Upstream docs say `localhost:3000/api/webhooks/stripe`. That path is **wrong**
for this codebase. Use the paths above.

### Resend

Transactional email (contact form, notifications).

- [ ] https://resend.com/api-keys → `RESEND_TOKEN="re_..."`
- [ ] Verify a sending domain in Resend → `RESEND_FROM="noreply@yourdomain.com"` (must be a valid email)
- [ ] Put in `apps/app`, `apps/web`, `apps/api` `.env.local`
- [ ] Verify: submit http://localhost:3001/en/contact → email arrives

### Svix

Outbound webhooks portal (`/webhooks` page in the app).

- [ ] https://dashboard.svix.com → **API Access** → `SVIX_TOKEN="sk_..."` (or `testsk_...`)
- [ ] Put in `apps/app/.env.local`
- [ ] Verify: sidebar → Webhooks shows the Svix portal iframe (with an org selected)

### Liveblocks

Live cursors and avatar stack on the dashboard.

- [ ] https://liveblocks.io/dashboard → project → **API keys** → secret `sk_...`
- [ ] `LIVEBLOCKS_SECRET="sk_..."` in `apps/app/.env.local`
- [ ] Verify: dashboard header shows avatars; two browsers show each other's cursors

### Knock

In-app notification feed.

- [ ] https://dashboard.knock.app → **Developers → API keys**: public key → `NEXT_PUBLIC_KNOCK_API_KEY`, secret key → `KNOCK_SECRET_API_KEY`
- [ ] **Integrations → Channels** → create an *In-app feed* channel → ID → `NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID`
- [ ] Put in `apps/app/.env.local`
- [ ] Verify: bell icon in the sidebar opens a feed

`.env.example` also lists `KNOCK_API_KEY` and `KNOCK_FEED_CHANNEL_ID`
(non-public). No code reads them; they're safe to leave unset.

### PostHog

Product analytics (proxied through `/ingest` by `packages/next-config`).

- [ ] https://app.posthog.com → **Project settings** → Project API key `phc_...`
- [ ] `NEXT_PUBLIC_POSTHOG_KEY="phc_..."`, `NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"`
      (EU: `https://eu.i.posthog.com`, then also update the rewrites in `packages/next-config/index.ts`)
- [ ] Put in `apps/app`, `apps/web`, `apps/api` `.env.local`
- [ ] Verify: PostHog → Activity shows pageviews

### Google Analytics

- [ ] https://analytics.google.com → GA4 property → Data stream → Measurement ID
- [ ] `NEXT_PUBLIC_GA_MEASUREMENT_ID="G-..."` in `apps/app`, `apps/web`, `apps/api`

### Arcjet

Bot protection and security rules (`packages/security`).

- [ ] https://app.arcjet.com → site → key `ajkey_...`
- [ ] `ARCJET_KEY="ajkey_..."` in `apps/app`, `apps/web`
- [ ] Verify: `curl -A "bad-bot" http://localhost:3001/en` returns 403

### Feature flags

Vercel Flags SDK + toolbar.

- [ ] Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
- [ ] `FLAGS_SECRET="<generated>"` in `apps/app`, `apps/web`
- [ ] Verify: Vercel toolbar appears (requires `vercel link` for full functionality)

### BetterStack

Logging and uptime.

- [ ] https://betterstack.com/logs → create source (Next.js) → source token → `BETTERSTACK_API_KEY`, ingesting URL → `BETTERSTACK_URL`
- [ ] Put in `apps/app`, `apps/web`, `apps/api`
- [ ] Verify: the "Envvars not detected" warning disappears from dev logs; logs arrive in BetterStack

### Sentry

Error tracking. Not in any `.env.example`; add manually.

- [ ] https://sentry.io → project (Next.js) → **Client Keys (DSN)** → `NEXT_PUBLIC_SENTRY_DSN`
- [ ] `SENTRY_ORG`, `SENTRY_PROJECT` (slugs) for source-map upload at build time
- [ ] Put in `apps/app`, `apps/web`, `apps/api` `.env.local` (or install the Vercel marketplace integration)

### Upstash

Rate limiting (`packages/rate-limit`, used by `apps/web`). Not in any `.env.example`.

- [ ] https://console.upstash.com → Redis database → **REST API** section
- [ ] `UPSTASH_REDIS_REST_URL="https://...upstash.io"`, `UPSTASH_REDIS_REST_TOKEN="..."` in `apps/web/.env.local`

### Vercel Blob

File storage (`packages/storage`). Not extended by any app yet.

- [ ] Vercel project → **Storage** → Blob → `BLOB_READ_WRITE_TOKEN`
- [ ] Add `storage` keys to the consuming app's `env.ts`, set the token in its `.env.local`

### OpenAI

AI utilities (`packages/ai`). Not extended by any app yet.

- [ ] https://platform.openai.com/api-keys → `OPENAI_API_KEY="sk-..."`
- [ ] Add `ai` keys to the consuming app's `env.ts`, set the key in its `.env.local`

### Languine

Translation CLI for `packages/internationalization` (`bun run translate`).

- [ ] https://languine.ai → project ID → `LANGUINE_PROJECT_ID` in `packages/internationalization/.env.local`

### URLs

- [ ] Local defaults are pre-set. For deployment set `NEXT_PUBLIC_APP_URL`,
      `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DOCS_URL` to
      production domains, and `VERCEL_PROJECT_PRODUCTION_URL` per app.

---

## 5. Environment reference

Validation comes from the package `keys.ts`. "Req" = required for the app to boot.

| Variable | Package | Format / validation | Req | Apps | Source |
| --- | --- | --- | :-: | --- | --- |
| `DATABASE_URL` | database | URL | ✅ | app, api, (web), `packages/database/.env` | Local Postgres / Neon |
| `NEXT_PUBLIC_APP_URL` | next-config | URL | ✅ | app, web, api | `http://localhost:3000` |
| `NEXT_PUBLIC_WEB_URL` | next-config | URL | ✅ | app, web, api | `http://localhost:3001` |
| `NEXT_PUBLIC_API_URL` | next-config | URL | | web | `http://localhost:3002` |
| `NEXT_PUBLIC_DOCS_URL` | next-config | URL | | app, web, api | `http://localhost:3004` |
| `VERCEL_PROJECT_PRODUCTION_URL` | next-config | string | | app, web, api | Vercel sets it; local = the app's own URL |
| `CLERK_SECRET_KEY` | auth | `sk_` | | app, web, api | Clerk → API Keys |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | auth | `pk_` | | app, web, api | Clerk → API Keys |
| `CLERK_WEBHOOK_SECRET` | auth | `whsec_` | | api | Clerk → Webhooks |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `_SIGN_UP_URL` / `_AFTER_SIGN_IN_URL` / `_AFTER_SIGN_UP_URL` | auth | starts with `/` | | app, web, api | preset |
| `BASEHUB_TOKEN` | cms | `bshb_pk_` | | web, `packages/cms` | BaseHub → API Tokens |
| `STRIPE_SECRET_KEY` | payments | `sk_` | | api | Stripe → API keys |
| `STRIPE_WEBHOOK_SECRET` | payments | `whsec_` | | api | `stripe listen` / Stripe webhooks |
| `RESEND_TOKEN` | email | `re_` | | app, web, api | Resend → API keys |
| `RESEND_FROM` | email | valid email | | app, web, api | Verified sender |
| `SVIX_TOKEN` | webhooks | `sk_` or `testsk_` | | app | Svix → API Access |
| `LIVEBLOCKS_SECRET` | collaboration | `sk_` | | app | Liveblocks → API keys |
| `KNOCK_SECRET_API_KEY` | notifications | string | | app | Knock → API keys |
| `NEXT_PUBLIC_KNOCK_API_KEY` | notifications | string | | app | Knock → API keys (public) |
| `NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID` | notifications | string | | app | Knock → In-app feed channel |
| `NEXT_PUBLIC_POSTHOG_KEY` | analytics | `phc_` | | app, web, api | PostHog → Project settings |
| `NEXT_PUBLIC_POSTHOG_HOST` | analytics | URL | | app, web, api | `https://us.i.posthog.com` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | analytics | `G-` | | app, web, api | GA4 data stream |
| `ARCJET_KEY` | security | `ajkey_` | | app, web | Arcjet |
| `FLAGS_SECRET` | feature-flags | string (32-byte base64url) | | app, web | Generate |
| `BETTERSTACK_API_KEY` | observability | string | | app, web, api | BetterStack source token |
| `BETTERSTACK_URL` | observability | URL | | app, web, api | BetterStack ingesting URL |
| `NEXT_PUBLIC_SENTRY_DSN` | observability | URL | | app, web, api | Sentry → Client Keys |
| `SENTRY_ORG`, `SENTRY_PROJECT` | observability | string | | app, web, api | Sentry slugs |
| `UPSTASH_REDIS_REST_URL` | rate-limit | URL | | web | Upstash → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | rate-limit | string | | web | Upstash → REST API |
| `BLOB_READ_WRITE_TOKEN` | storage | string | | (none yet) | Vercel → Storage → Blob |
| `OPENAI_API_KEY` | ai | `sk-` | | (none yet) | OpenAI → API keys |
| `LANGUINE_PROJECT_ID` | (CLI) | string | | `packages/internationalization` | Languine |
| `ANALYZE` | next-config | string | | any | `ANALYZE=true bun run analyze` |

Listed in `.env.example` but unused by code: `KNOCK_API_KEY`, `KNOCK_FEED_CHANNEL_ID`.

---

## 6. Deploying

- **Vercel** (upstream default): one Vercel project per app (`apps/app`,
  `apps/web`, `apps/api`, …) with the Root Directory set to the app folder. Add env vars
  per project. See `docs/content/docs/deployment/vercel.mdx`.
- **Docker / self-hosting** (Cloud Run, Fly, Railway…): enable
  `output: "standalone"` and follow `docs/content/docs/deployment/docker.mdx`.
- **Database**: use Neon (or any Postgres reachable via the Neon serverless
  driver). Run `bun run migrate:deploy` in CI before deploying.
- **Cron**: `apps/api/app/cron/keep-alive` is wired for Vercel Cron.
  Other platforms need an external scheduler hitting the route.
- Update all `NEXT_PUBLIC_*_URL` values and webhook endpoints (Clerk, Stripe,
  Svix) to production domains.

---

## 7. Upstream: history, updates and why it is set up this way

### How this repo relates to next-forge

- The history **is** next-forge's history. The starter's commits sit on top of
  upstream commit `f189de7` ("Remove docs tweet wall (#751)", 2026-05-28),
  which is **after** the last release tag `v6.0.2` (2026-03-20).
  `package.json` `version` still says `6.0.2`.
- Remotes in a project cloned from this starter (see [§2](#2-path-b--production-foundation-every-integration-wired-or-removed)):
  - `origin` → your project repo
  - `starter` → `mantavyamstudios/turborepo-starter` (this repo)
  - `upstream` → `vercel/next-forge`

### Pulling updates

**From upstream next-forge** (into this starter, or directly into a project):

```sh
git fetch upstream --tags
git log --oneline HEAD..upstream/main     # what's new
git merge v6.x.y                          # prefer release tags over main
# resolve conflicts (see hot-spots below)
bun install && bun run setup:local && bun run dev:local
```

**From this starter into a project** built on it:

```sh
git fetch starter
git merge starter/main
```

Because the histories are shared, these are normal three-way merges.
Conflicts only happen in files both sides changed.

**Conflict hot-spots** (files this starter modifies, see [§8](#8-changes-from-upstream-next-forge)):
`packages/*/keys.ts` (one TODO line at top), `packages/database/index.ts`,
`packages/database/prisma.config.ts`, `packages/cms/components/*`,
`packages/auth/provider.tsx`, `apps/app/app/(authenticated)/*`,
`*.env.example` (header), `package.json`, `bun.lock` (regenerate with
`bun install` rather than hand-merging), `.github/workflows/release.yml`.

### Official `npx next-forge update`

next-forge also ships `npx next-forge update --from <v> --to <v>`. It clones
upstream and **copies changed files over yours** (file-level overwrite,
no merge). If you use it, review `git diff` afterwards and restore local
changes by hand. `git merge` is safer for a repo with customizations.

### Why not Fork / "Use this template" / a zip

| Option | Problem |
| --- | --- |
| Fork | A fork of a public repo must stay public. It stays attached to `vercel/next-forge` (PRs default there). |
| Use this template | Creates a squashed, unrelated history: every upstream merge needs `--allow-unrelated-histories` and conflicts everywhere. |
| Download zip | Same as template: no shared history. |
| **Clone with history + remotes** ✅ | Private or public, and real three-way merges from both `upstream` and `starter`. |

### Repo hygiene inherited from upstream

- `.github/workflows/release.yml` publishes the next-forge CLI. It's guarded
  with `github.repository == 'vercel/next-forge'`, so it never runs here.
- Root `package.json` is `private: true` (prevents accidental `npm publish` of
  the upstream `bin`/`publishConfig` setup). `scripts/` holds the upstream
  CLI (`init`, `update`) and `docs/` holds the next-forge documentation site.
  Keep them for reference or delete them in your project.
- `.github/dependabot.yml` opens monthly dependency PRs. Merge upstream before
  bumping dependencies yourself to reduce lockfile conflicts.
- Upstream uses Biome via `ultracite`: `bun run check` / `bun run fix`.

---

## 8. Changes from upstream next-forge

| File | Change | Why |
| --- | --- | --- |
| `packages/database/index.ts` | `@prisma/adapter-pg` for localhost URLs, `PrismaNeon` otherwise | Local Postgres has no Neon websocket proxy |
| `packages/database/prisma.config.ts` | Load `packages/database/.env` via dotenv | Prisma 7 no longer auto-loads `.env`; Studio runs from `apps/studio` |
| `packages/database/prisma/migrations/` | Initial migration for the stub `Page` model | Replace with your schema |
| `bunfig.toml` | Isolated linker + publicly hoist the `pg` family | Next externalizes `pg`; its deps must resolve from app roots. Full hoisting breaks Storybook (the `storybook` workspace shadows the `storybook` package) |
| `packages/cms/components/{toolbar,feed}.tsx` | Nothing / a notice without `BASEHUB_TOKEN` | BaseHub components throw without a token |
| `apps/app/app/(authenticated)/{page,search/page,webhooks/page}.tsx` + `components/empty-state.tsx` | Empty states instead of 404 / thrown error | No active org → 404; no `SVIX_TOKEN` → crash |
| `apps/web/.gitignore` | Ignore `/.clerk/` | Added by Clerk keyless mode (keeps its secrets out of git) |
| `packages/*/keys.ts`, `packages/auth/provider.tsx`, `*.env.example` | `TODO(setup)` comments | Point to this guide |
| `package.json` | `name`, `private`, `setup:local`, `dev:local` | Starter identity, key-free workflow |
| `scripts/setup-local.sh` | Env + DB bootstrap | Reproducible setup |
| `.github/workflows/release.yml` | Run only in `vercel/next-forge` | Avoid releases/publish attempts here |
| `apps/docs/docs.json` | Generated by current Mintlify CLI from `mint.json` | Newer CLI config format |
| `SETUP.md`, `README.md` (banner) | This guide + pointer to it | — |

---

## 9. Known issues

| Symptom | Cause | Fix |
| --- | --- | --- |
| "A tree hydrated but some attributes… didn't match" (Radix `id` / `aria-controls`) | Clerk **keyless** mode wraps the app in an extra client-only component, shifting React `useId` | Set Clerk keys. Verified to disappear with keys set |
| Console `401` on `/sign-in` | Clerk's unauthenticated handshake | Expected |
| Dashboard shows "No organization selected" | No active Clerk organization | Create one via the sidebar switcher |
| Blog/legal show "CMS content unavailable" | No `BASEHUB_TOKEN` | See BaseHub |
| `api:dev: [stripe] ... exited with code 127` | Stripe CLI not installed | Install + `stripe login`, or ignore with `dev:local` |
| `web /` returns 404, `/en` works | Upstream i18n middleware composition | Use `/en` |
| Sidebar links other than *Webhooks* do nothing | Upstream placeholders (`#`) | Replace with your routes |
| Some `apps/docs` links 404 | Mintlify sample content references pages it doesn't include | Replace docs content |
| `@clerk/nextjs` ≥ 7.9 throws "Clerk keys are missing" at the middleware | Newer Clerk drops keyless middleware support | Stay on the pinned version until keys are set |
| `Cannot find module 'pg-types'` | `bunfig.toml` hoisting lost or `node_modules` installed with another linker | `rm -rf node_modules && bun install` |

---

## 10. Verification checklist

Run after setup, after wiring keys, and after every upstream merge.

- [ ] `bun install` succeeds
- [ ] `bun run migrate:deploy` → "Database schema is up to date" / migrations applied
- [ ] `bun run dev:local` → all of 3000, 3001, 3002, 3003, 3004, 3005, 6006 respond
- [ ] http://localhost:3002/health → `OK`
- [ ] http://localhost:3001/en, `/en/pricing`, `/en/blog`, `/en/contact` → 200, no console errors
- [ ] http://localhost:3000/sign-up → sign up, create organization → dashboard, `/search?q=test`, `/webhooks` render
- [ ] http://localhost:6006 → stories load
- [ ] `bun run check` (lint) and `bun run build` pass
- [ ] `grep -rn "TODO(setup)" ...` → remaining items are integrations you deliberately left off
