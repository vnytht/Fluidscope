# WaterScope

A community map of **private, untested drinking water** in the Viana do Castelo district, Portugal.

Residents log strip readings from mines, dug wells, boreholes, springs, and reservoirs. Each pin is one snapshot. Together they make a picture official monitoring does not have — most of these sources are off the public network, and septic tanks and other point hazards are **not officially mapped** here.

Live: [waterscope.waterscope-berkeley.workers.dev](https://waterscope.waterscope-berkeley.workers.dev)

This repo is the **web platform**. WaterScope as a project also includes paper test kits and workshops. The map is the shared record those sessions produce.

---

## Why this district

Viana do Castelo has ~85k people, of whom ~36k live in the urbanised core. Private wells and *minas* remain ordinary outside that core.

Field work already found:

- **Nitrate** in about a third of samples — a health risk for infants (methaemoglobinaemia) and relevant to irrigation.
- **pH** averaging about **5.8**, below the EU drinking-water range. Regional paper and eucalyptus industry is a known acidifying pressure; granite weathering also yields soft, poorly buffered water.

A reading here is not a lab certificate. It is a **field strip**, on a **scale with open-ended last marks** (`50` is “at 50”; `100+` is “100 or higher”).

---

## Hydrogeology (what the map may claim)

Much of the district is **fractured granite**: little storage, fast response. Quality can change within **days of rain**. A sample is as much weather as it is “the well.” That is why the form asks for **sample date** and **recent rainfall**.

Schist and alluvium in other parts of the district store and filter more. Geology is not uniform; the app must not pretend every pin sits in the same aquifer.

**Surface catchments ≠ groundwater.** Two wells in the same HydroBASINS polygon are **neighbours**, not “upstream / downstream of each other.” We do not have travel time, shared-fracture paths, or discharge volume. Overlay after a tap shows:

| Zone | Meaning |
|------|---------|
| This catchment | The HydroBASINS L12 polygon the pin sits in |
| Uphill | Polygons that drain *into* this one (`NEXT_DOWN` inverted) |
| Downhill | Walk `NEXT_DOWN` until the network ends |

That is **landscape topology**, not “this well contaminates that river.” Pin-to-pin flow arrows were rejected: they read as water crossing fields. MERIT Hydro was rejected: coarser than what we already have, worse local fit than APA for Portugal.

Official APA 1:25k watercourses can be drawn as lines. They are **not** used to snap a well to “its” river. HydroRIVERS snap inside a basin is not trustworthy enough to label same-basin pins up/down.

Deeper notes: [`docs/HYDROLOGY_HANDOFF.md`](docs/HYDROLOGY_HANDOFF.md).

---

## How a colour is decided

Limits follow **EU Drinking Water Directive 2020/2184**, applied in Portugal by **Decreto-Lei 69/2023**, where a parametric value exists. Otherwise **WHO** (or **US EPA** where the scale says so). A value **exactly on the limit is green**. Parameters with no EU / WHO / Portuguese limit are **number only, no colour**.

Examples the strips use:

- **pH** green 6.5–9.5 (EU)
- **Nitrate** as NO₃ green 0–50 ppm (EU); last mark `100+`
- **Nitrate as N** green 0–11.3 ppm (same 50 ppm NO₃, converted)
- **E. coli / total coliforms** green only at WHO **Low risk / Safe** (EU: 0 / 100 mL)
- **Hardness, MPS, sulfite, carbonate**: stored, not coloured

Each measure with a reference has a **Further information** link (EUR-Lex, WHO, USGS, Águas do Alto Minho). The app does not replace a laboratory or a physician.

Hazard pins exist because **septic tanks, livestock, spraying** are crowdsourced here. They are gold triangles, not coloured dots — a different claim: “something risky nearby,” not a water chemistry band.

---

## Who may change the map

Anyone with an account can **add** a source or hazard and **edit their own** pin.

**Delete** is staff only: `hilamor@berkeley.edu` and `vinaythorat@berkeley.edu` (`STAFF_EMAILS` in Wrangler). Residents cannot remove pins, including their own. That keeps a workshop from emptying the map by accident.

Chat is grouped by **town / basin**. Threads are visible across groups, not siloed.

---

## Run locally

```bash
npm install
npm run dev
```

Open **http://localhost:5173/** (Vite may bind IPv6; use `localhost`, not always `127.0.0.1`). API: Worker + D1 on **:8787**.

```bash
npm run lint
npm run test:api
npm run ship    # lint, smoke tests, build, wrangler deploy
```

Stack: React 19 + Vite 8 + Leaflet, Cloudflare Worker, D1. Passwords are PBKDF2; session is an HttpOnly cookie. Gemini Q&A is specified, not in this tree yet.

---

## What this is not

- Not a substitute for **accredited drinking-water analysis**
- Not a **groundwater model**
- Not a **discharge / volume** map (HydroBASINS gives area and drain-to, not flow)
- Not anonymous forever: identity exists so people can edit their pins; delete stays with facilitators

---

## Further reading in this repo

| File | What it is |
|------|------------|
| [`CLAUDE.md`](CLAUDE.md) | Product brief (Viana, kits, workshops, FTU/STU flows) |
| [`docs/HYDROLOGY_HANDOFF.md`](docs/HYDROLOGY_HANDOFF.md) | What the GIS may and may not say |
| [`GeoJSON/README.md`](GeoJSON/README.md) | Layer inventory (HydroBASINS, APA, DEM streams) |
| [`src/lib/qualityBands.js`](src/lib/qualityBands.js) | Strip scales and legal / WHO bands |
| [Directive (EU) 2020/2184](https://eur-lex.europa.eu/eli/dir/2020/2184/oj) | Parametric values used for colour |
