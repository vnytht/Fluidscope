# WaterScope production readiness

**Inspected:** 27 Sep 2026  
**Scope:** this repository as it exists now. Nothing below was assumed from memory.  
**Constraint:** no production behavior, credentials, deploy settings, schemas, or dependencies were changed. This document is the plan only.

**Scale you stated:** ~10–20 people at once in Portugal (PT-PT), adding sources, filtering/searching, chatting, later reviewing what they entered.

**Host you stated:** Cloudflare.

---

## 1. Executive summary

WaterScope is a **Vite 8 + React 19 + Leaflet** SPA (`package.json`). There is **no backend, no database, no Cloudflare config, no CI, and no tests**. Auth, samples, hazards, chat, and the activity log live in **browser memory + `localStorage`**. Refreshing the page drops community data back to seed mocks. Passwords are **unsalted SHA-256** in `localStorage`. That is not production identity.

The app can be **hosted** on Cloudflare Pages today as a static site. It cannot yet **operate** as a shared community product: users cannot see each other’s new pins, chat is not shared, and you cannot later query “what did they add?” from a server.

For 10–20 concurrent users the load is small. The work is **correctness, persistence, privacy (GDPR), and honest ops** — not Kubernetes. On Cloudflare the fit is: **Pages (SPA) + Worker API + D1 (SQLite) + R2 (photos later) + Analytics Engine or a simple `events` table**. Do not add a queue yet.

**Critical-path user workflows today**

| Workflow | What actually happens |
|---|---|
| Log in / create account / forgot password | `src/lib/authStore.js` + `src/context/AppStateContext.jsx`. Users and hashes stay on that device. Forgot password does not send email. |
| Add / edit source + optional hazard pins | `src/components/AddFlow/AddFlowSheet.jsx` → `addSample` / `updateSample` / `addMapHazards`. In-memory only. |
| Browse / filter map | `src/lib/filters.js`, `FilterBar`. Filters seed + session data in RAM. |
| Open source / hazard drawers | `SourceDetailSheet`, `HazardDetailSheet`. |
| Chat by town | `ChatPanel` + seed threads/messages. New posts stay in RAM. |
| Streams layer + flow arrows | `DetailedWaterLayer.jsx` fetches ~tens of MB of GeoJSON from `public/data/`. |
| Language EN/PT | `LanguageContext` + `src/lib/i18n.js`. |

**What the brief said vs what the repo has**

`CLAUDE.md` still lists Supabase, Gemini (server-side key), and Vercel/Netlify. **None of those are implemented.** There is no `.env`, no `wrangler.toml`, no `.github/workflows`.

---

## 2. What was inspected (facts)

| Area | Finding | Evidence |
|---|---|---|
| Stack / runtime | React 19.2, Vite 8.2, Leaflet 1.9, react-leaflet 5. npm (`package-lock.json`). Scripts: `dev`, `build`, `lint` (oxlint), `preview`. No TypeScript in app code. | `package.json` |
| Package manager | npm | `package-lock.json` |
| Deploy / infra | No Pages/Workers/D1/R2 config. No Docker. `vite.config.js` only sets dev `PORT`. | repo root; `vite.config.js` |
| AuthZ | Gate: `if (!user) return <LoginScreen />` in `AppGate`. No roles, no ownership check on edit. Any signed-in user can call `updateSample` for any id. | `src/App.jsx`, `AppStateContext.jsx` |
| AuthN | Username + email + password. Hash: `crypto.subtle.digest('SHA-256')` — no salt, not Argon2/bcrypt. Session = `localStorage` key `waterscope.user`. | `src/lib/authStore.js` |
| Database / queues | None. Seeds: `src/lib/mockData.js`. | `AppStateContext.jsx` lines 16–18 comment; `SEED_*` imports |
| Storage | `localStorage`: users, current user, activity (cap 200). Samples/chat **not** written to storage. | `authStore.js`; `logActivity` in `AppStateContext.jsx` |
| Third parties | OSM / OpenTopo / Esri tiles (`mapConfig.js`). Nominatim search + reverse geocode **without** a required identifying `User-Agent`. Google Fonts from `index.html`. No Gemini, no Supabase client. | `src/lib/mapConfig.js` 74–98; `index.html` 10–15 |
| Env / secrets | No `VITE_*` usage. No `.env` example. `.gitignore` ignores `*.local`. | grep; `.gitignore` |
| CI / tests / format | No `.github/`. No `*.test.*` / `*.spec.*`. Lint: oxlint + `.oxlintrc.json`. No Prettier/ESLint. | glob + `package.json` |
| Logging / errors / health / APM | No Error Boundary. `console.error` on GeoJSON fetch fail. No health route (SPA only). No Datadog/Sentry. | `main.jsx`; `DetailedWaterLayer.jsx` 21 |
| i18n | EN + `pt-PT` strings. HTML `lang="en"` is static. | `index.html` 2; `LanguageContext.jsx` |
| Prototype leftovers | Hash labs: `#history-ux`, `#flow-viz`, `#stream-flow`, `#app-streams`. FTU always opens add-flow (`flowActive` default `true`). | `src/App.jsx` 48, 297–304 |
| Static payload | `public/data` ≈ **67 MB** (oriented DEM streams, contours, etc.). Built `dist` ≈ 31 MB when present. | `du` |
| Accessibility | `maximum-scale=1.0, user-scalable=no` blocks pinch-zoom. | `index.html` 6–8 |

---

## 3. Prioritized gaps

| Priority | Gap | Why it matters at 10–20 users | Evidence |
|---|---|---|---|
| **Critical** | No shared backend. Adds, chat, hazards die on refresh and never reach other phones. | Community map and “look at the data later” are impossible. | `AppStateContext.jsx` 16–18, 34–38; `addSample` only `setSamples` |
| **Critical** | Auth is device-local and weakly hashed. Forgot password is local reset only. | Accounts are not portable; hashes are extractable from DevTools; no email proof. | `authStore.js` 5–8, 20–45; `LoginScreen.jsx` forgot mode |
| **Critical** | No GDPR-ready legal basis, privacy notice, retention, or export/delete. | You collect email, name, locations, health-adjacent water readings in Portugal. | No privacy route; `signup` stores email |
| **High** | Activity log is per-browser, max 200, not queryable by you. | You asked to see how/what people enter. That data never leaves the phone. | `saveActivity` `slice(0, 200)` |
| **High** | Anyone logged in can edit any sample (`updateSample(id, patch)`). | “Edit your own pin” from the brief is not enforced. | `AppStateContext.jsx` `updateSample`; `startEdit` in `App.jsx` |
| **High** | Nominatim called from the browser with no app User-Agent. | OSM usage policy; can get blocked mid-workshop. | `mapConfig.js` `search` / `reverseGeocode` |
| **High** | OSM/OpenTopo tiles have no SLA; 20 users panning is usually fine, a workshop + Streams layer is a lot of tile + GeoJSON download. | First-open stall on rural mobile; tile ToS. | `mapConfig.js` 14–15; `public/data` 67 MB |
| **High** | No CI, no tests, no deploy pipeline to Cloudflare. | Broken `main` goes live if someone uploads `dist` by hand. | no `.github/`; no `wrangler.toml` |
| **High** | Prototype hash pages and always-on add-flow ship if you deploy this tree. | Confusing for residents; labs are not the product. | `App.jsx` 48, 297–304 |
| **Medium** | No error boundary / offline / failed-save UX. | One Leaflet/React throw blanks the app. | `main.jsx` |
| **Medium** | No TypeScript; oxlint only. | Easy regressions in filters/chat payloads. | `package.json`; `.oxlintrc.json` |
| **Medium** | HTML `lang` not tied to locale; pinch-zoom disabled. | PT users + accessibility. | `index.html` |
| **Medium** | Chat “moderated by a person” is copy only — no report/moderation queue. | Brief: do not build automated moderation; still need a human path. | `CLAUDE.md`; `ChatPanel` |
| **Medium** | Photos in the FTU brief are not a storage pipeline. | Will need R2 + size limits if you add photos. | `CLAUDE.md` step 5 vs no upload API |
| **Low** | README is still the Vite template. | New contributors cannot deploy. | `README.md` |
| **Low** | Gemini Q&A not built (good — no leaked key). | Product later; keep keys on a Worker. | `CLAUDE.md` vs no Gemini code |
| **Low** | `viewport` + large GeoJSON on Streams. | Performance, not correctness, at this N. | `DetailedWaterLayer.jsx` fetch |

---

## 4. What “built well” looks like for this N (engineering stance)

Do **not** overbuild. Ten people chatting is one D1 database and a thin Worker.

**Recommended Cloudflare shape**

1. **Cloudflare Pages** — `npm run build` → `dist`. SPA fallback to `index.html`.
2. **Worker** (same account, `/api/*`) — HTTPS only. Auth cookies (`HttpOnly`, `Secure`, `SameSite=Lax`). Never put password hashes in the SPA.
3. **D1** — tables: `users`, `sources`, `readings`, `hazards`, `chat_threads`, `chat_messages`, `events`.
4. **R2** — optional, when photos exist. Signed upload URLs.
5. **Observability** — Worker `console` → Cloudflare logs; plus `events` rows for product analytics (see below). Optional later: Cloudflare Analytics Engine. Skip Datadog until you have a reason.

**Auth (replace localStorage)**  
Use **Cloudflare Access is the wrong tool** for resident sign-up (it’s for your team). Use a Worker + D1:

- Register / login with email + password (**Argon2id** or Worker’s WebCrypto PBKDF2 with unique salt — not raw SHA-256).
- Session: random token or signed JWT, **server-side revoke** on logout.
- Forgot password: email link (Resend, Postmark, or Cloudflare Email Routing + a token table). The current UI cannot do this alone.
- Authorization: `sources.created_by = user.id` for edit; chat is read/write for any signed-in user in that town (matches “not siloed”).

**Collect data so you can look later**

Write an **`events` append-only table** (Lisbon timestamps you already use in `src/lib/lisbonTime.js`):

| column | example |
|---|---|
| `at` | ISO UTC (display Lisbon in the admin UI) |
| `user_id` | uuid |
| `type` | `signup`, `source_create`, `source_update`, `hazard_create`, `filter_apply`, `chat_reply`, `login` |
| `payload` | JSON: source type, usage tags, reading bands, town id — **not** raw password |

That is how you answer “how did they add, what did they enter?” without scraping phones.

Keep a separate **admin read path** (you + researchers): SQL in D1 dashboard or a locked `/admin` Worker with Access **for staff only**.

**Maps / tiles (latest practical advice)**  
Do not hammer `tile.openstreetmap.org` from a workshop. For production, use **Cloudflare to proxy** a allowed tile source, or **Protomaps / self-hosted PMTiles on R2**, or a commercial tileset. Nominatim: proxy through the Worker with a real `User-Agent` and cache.

**Streams layer**  
Do not ship all 67 MB of `public/data` to every phone. Keep APA rivers + water bodies for the live map; leave DEM-oriented / lab HTML off the production build.

**i18n / Portugal**  
Keep `pt-PT`. Set `<html lang>` from `LanguageContext`. Privacy text in Portuguese. CNPD-minded retention: define how long location + email stay.

---

## 5. Phased remediation plan

### Phase 0 — deploy the static shell (1–2 days, after you approve)

- Cloudflare Pages project from this repo, build `npm run build`, output `dist`.
- Custom domain + HTTPS (Pages default).
- **Do not** treat this as the community launch. Label it “preview” if residents can reach it.
- Strip or gate hash labs (`#stream-flow`, `#history-ux`, …) so they are not the product.

### Phase 1 — shared truth (the real launch bar)

- Worker + D1 schema for users, sources, readings, hazards, chat, events.
- Replace `authStore` / in-memory `addSample` / chat with API calls.
- Enforce own-pin edit.
- Server activity/events with Lisbon display.
- Password reset email.
- Privacy page + consent on signup (product copy, legal review).

### Phase 2 — workshop hardness

- Tile/Nominatim proxy or PMTiles.
- Trim production GeoJSON (APA + OSM rivers only).
- CI: GitHub Actions → `oxlint` + `vite build` + Pages deploy.
- React error boundary + “couldn’t save, try again”.
- Smoke tests: signup, add source, filter, chat (Playwright is enough).

### Phase 3 — research / ops

- Staff-only export (CSV/Parquet) of sources + events.
- Optional R2 photos.
- Optional Gemini **only** on the Worker, never `VITE_`.
- Accessibility: allow zoom; audit drawers with a keyboard.

**Out of scope until Phase 1 works:** queues, Kubernetes, Datadog APM, multi-region, GraphQL.

---

## 6. Do not auto-change

These need an explicit yes from product, legal, or infra. Do not implement until you say so.

| Decision | Why a human must choose |
|---|---|
| **Cloudflare D1 vs Supabase** | `CLAUDE.md` said Supabase; you said Cloudflare. Pick one source of truth. |
| **Must residents have accounts?** | Brief still has an open “no login vs login” conflict (`CLAUDE.md`). |
| **Who may edit/delete a pin?** | Owner only vs workshop facilitator vs anyone. |
| **What is stored and for how long?** | GPS + nitrate/pH can be sensitive. Retention and who sees the admin export. |
| **Email provider for password reset** | Required for real “forgot password”. |
| **Tile provider / paid OSM** | Legal + cost. |
| **Ship Streams + arrows on by default** | Large download; product choice. |
| **Gemini / LLM helper** | Cost, safety, language (PT). |
| **Cookie / analytics consent** | If you add Cloudflare Web Analytics or events beyond strictly necessary. |
| **Production domain and whether labs stay in the repo** | Hash prototypes vs public URL. |
| **Credentials / API keys** | None exist yet; never commit them. |
| **Schema migrations** | No DB yet; first schema is a one-way door. |
| **Dependency upgrades** | Not required for this plan. |

---

## 7. Likely first approval (so work can start)

If you want the smallest honest launch for 10–20 people in Viana:

1. **Cloudflare Pages + Worker + D1** (not Supabase, unless you reverse the host decision).
2. **Accounts stay** (you already built the UI).
3. **Events table** for research (Lisbon time in the UI).
4. **Labs off** on the production hostname.

Reply with those four yes/no answers. After that, implementation can start without guessing.
