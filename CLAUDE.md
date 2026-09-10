# WaterScope — Watershed Water Platform

Mobile-first web app (React) where residents of a rural Portuguese watershed log
readings from their private, untested water sources (wells, mines, springs,
reservoirs) and see them join a shared community map.

This is the **web platform** piece of a larger 3-part project called WaterScope:
paper-based testing kits + community workshops + this web platform. The platform
turns individual test-strip readings into a collective, visible picture of
watershed health.

## Real-world context (from the FluidScope research deck)

- Location: Viana do Castelo, Portugal. Pop. 85k, ~36k urbanized.
- 34 field samples already collected from private/untreated wells, mines,
  reservoirs, springs.
- Priority test parameters: **nitrate** (35% tested positive — health risk incl.
  "blue baby syndrome" in infants, also relevant to irrigation) and **pH**
  (avg 5.8, low — driven by regional paper/eucalyptus industry). E. coli/coliform
  is also health-critical but a more complex test to run in the field.
- Geology matters and should inform in-app copy: much of the district is
  **fractured granite** — low storage, fast response. Water quality can spike
  or change within days of rainfall, so a sample is as much a snapshot of
  recent weather as of the source itself. Worth capturing sample date +
  recent rainfall, and nudging people to sample within a defined window.
  Schist/alluvium areas behave differently (more storage, more filtering) —
  the geology isn't uniform across the district.
- Septic tanks and other point-source contamination are **not officially
  mapped** in this region. The hazard-reporting feature exists specifically
  to crowdsource this missing data — ask about nearby septic tanks,
  livestock, spraying, distance/direction.
- An in-app LLM Q&A helper is planned (calls Gemini) to answer participant
  questions and surface relevant context/visualizations.

## Confirmed free tech stack

| Part | Choice | Notes |
|---|---|---|
| Framework | React + Vite | |
| Map | Leaflet.js + OpenStreetMap tiles (or OpenTopoMap for terrain) | Free, no API key. OSM tile servers are donated infra with no SLA — fine for a prototype/demo, avoid bulk-prefetching tiles. |
| Location | Browser Geolocation API | Native, no library. Requires HTTPS or `localhost`. |
| Backend | Supabase (Postgres) | Free tier: 500MB DB, 50k MAU, 5GB egress. **Auto-pauses after 7 days of inactivity** — resume manually from the dashboard if it's gone quiet. |
| Q&A | Google Gemini API | Key stays server-side, never in client code. |
| Hosting (later) | Vercel or Netlify | |

## ⚠️ Open decision — resolve before building auth

The flow diagrams (below) put **"Log in"** as step 1 of onboarding. The earlier
desktop brief specified **no login**, anonymous participatory entry. These
conflict. Recommend starting without login (faster, matches original brief)
and only adding lightweight identity if "edit your own pin" genuinely needs
it — but confirm before scaffolding auth.

## User flow — First-Time User (FTU)

Explicit direction from the team: **"let them add the things first than
viewing it"** — the forced first path is adding a source, not passive
map-browsing.

1. **Onboarding** — value prop (see contamination / log your own / help the
   community). Show the map image first, then the rest.
2. **Locate** — place manually, or turn on device location. Submit.
3. **User info** — name, email, password *(see open decision above)*.
4. **Source** — select water source type (various options).
5. **Source details** — how deep? runs dry? photo?
6. **Readings** — what do the test strips show? pH? nitrate? other tests?
7. **Hazard** — anything risky nearby? type?
8. **Browse** — user browses other data points on the map.

## User flow — Second-Time User (STU)

Skips onboarding, straight to a fork:
- **Browse** — explore existing data points on the map.
- **Add** — option to add a source or a hazard.

## Edit your own pin

Entry points: tap an existing pin you own, OR a sidebar "My source" entry.
→ edit source (details / readings / hazard…) → **Submit**.

## Report a hazard (standalone flow)

Option to add a hazard → enter details → place on map → **Submit**.
(Separate from the sample flow — different marker shape, not a coloured dot.)

## Data & interaction notes (from working session with Hila)

- **Location input**, multiple methods: address / pin on map / azimuth /
  share device location.
- **Source type**: well, mine, … (full list from earlier brief: Mina, dug
  well, borehole, spring, shared reservoir, private reservoir).
- **Water quality entry**:
  - Select an existing measure from a list, OR
  - Add a new one (name + measurement scale, e.g. nitrate, pH)
  - Add reading to map
  - Mark as a risk: yes/no
- **Chat**: grouped by watershed. All participants can explore and see
  *other* groups too (not siloed).
- **Sessions**: data is collected per session; each sample should be
  tagged with which session it belongs to.
- **Filters**: filter the map by session / by source type / by water
  quality measure.

## Prior spec (from original desktop brief) — still broadly valid

- Layout: full-screen Leaflet map + collapsible left sidebar (icon rail ↔
  expanded panel), three tabs: **Add sample**, **Chat**, **Layers**.
- Intake fields per sample: `sourceType`, `location` (lat/lng),
  `nitrate` (band: 0/10/25/50/100+), `ph` (band: 5.5/6.5/7/8/9),
  `other` (free text), `resultBand` (derived: 0–10 green, 25 amber, 50+
  coral), `timestamp`.
- Hazard marker: differently-shaped from sample dots; has a type + risk
  level (safe → active/leaking).
- Suggested build order: project skeleton → real map fills screen →
  collapsible sidebar shell → add-sample form → markers + popover →
  layers/legend → chat (basic, no backend yet, "moderated by a person"
  note visible, **do not** build automated moderation) → Q&A helper
  (Gemini) → Supabase persistence (stretch goal, not required for demo).

## Existing prototype

A single-file mobile HTML/Leaflet demo already exists: a 3-step chip-based
form (source type → nitrate band → pH band) → tap-to-place on map →
colour-coded pin (green/amber/coral by nitrate). Useful as a visual
reference for the "Add sample" interaction specifically — treat the flows
above (FTU/STU, edit-pin, hazard, sessions/filters, chat) as the fuller,
more current spec.
