# WaterScope

Research prototype for a **community water-quality map** in the Viana do Castelo district, Portugal.

It is part of a larger research project (field kits, workshops, and this platform) on how residents of a rural watershed can record strip readings from untreated sources — mines, dug wells, boreholes, springs, reservoirs — and see those snapshots as a shared picture of catchment health. Official networks do not cover most of these sources. Point hazards such as septic systems are also poorly mapped in this region.

This is **research software**, not a public monitoring service, not a diagnostic tool, and not an invitation to browse or alter field data. Access is limited to the research team and workshop participants.

---

## Why this district

Viana do Castelo has ~85k people, of whom ~36k live in the urbanised core. Untreated household and community sources remain ordinary outside that core.

Field work already found:

- **Nitrate** in about a third of samples — a health risk for infants (methaemoglobinaemia) and relevant to irrigation.
- **pH** averaging about **5.8**, below the EU drinking-water range. Regional paper and eucalyptus industry is a known acidifying pressure; granite weathering also yields soft, poorly buffered water.

A reading in this study is a **field strip**, not an accredited laboratory result. Strip scales use open-ended last marks (`50` means “at 50”; `100+` means “100 or higher”).

---

## Hydrogeology (what a map of this kind may claim)

Much of the district is **fractured granite**: little storage, fast response. Quality can change within **days of rain**. A sample is as much a record of recent weather as of the source itself, which is why sample date and recent rainfall matter.

Schist and alluvium elsewhere in the district store and filter more. Geology is not uniform; pins must not be read as if they shared one aquifer.

**Surface catchments ≠ groundwater.** Two sources in the same HydroBASINS polygon are **neighbours**, not upstream/downstream of each other. The overlay does not give travel time, shared-fracture paths, or discharge volume. After a source is selected it can show:

| Zone | Meaning |
|------|---------|
| This catchment | The HydroBASINS L12 polygon the point sits in |
| Uphill | Polygons that drain *into* this one (`NEXT_DOWN` inverted) |
| Downhill | Walk `NEXT_DOWN` until the network ends |

That is **landscape topology**, not “this well contaminates that river.” Pin-to-pin flow arrows were rejected: they read as water crossing fields. MERIT Hydro was rejected: coarser than the local layers, worse fit than APA for Portugal.

Official APA 1:25k watercourses can be drawn as lines. They are **not** used to snap a well to “its” river. HydroRIVERS snap inside a basin is not trustworthy enough to label same-basin points up/down.

---

## How a colour is decided

Limits follow **EU Drinking Water Directive 2020/2184**, applied in Portugal by **Decreto-Lei 69/2023**, where a parametric value exists. Otherwise **WHO** (or **US EPA** where noted). A value **exactly on the limit is green**. Parameters with no EU / WHO / Portuguese limit are stored as numbers with **no colour**.

Examples:

- **pH** green 6.5–9.5 (EU)
- **Nitrate** as NO₃ green 0–50 ppm (EU); last mark `100+`
- **Nitrate as N** green 0–11.3 ppm (same 50 ppm NO₃, converted)
- **E. coli / total coliforms** green only at WHO **Low risk / Safe** (EU: 0 / 100 mL)
- **Hardness, MPS, sulfite, carbonate**: recorded, not coloured

References (EUR-Lex, WHO, USGS, and regional water-quality pages) sit with each measure. Colours do not replace a laboratory or clinical advice.

Reported nearby hazards (septic, livestock, spraying) are a separate layer of meaning: presence of a risk in the landscape, not a chemistry band.

---

## What this is not

- Not a substitute for **accredited drinking-water analysis**
- Not a **groundwater model**
- Not a **discharge or volume** map (HydroBASINS gives area and drain-to, not flow)
- Not a public open dataset or an open deployment

---

## Further reading

| | |
|--|--|
| [`docs/HYDROLOGY_HANDOFF.md`](docs/HYDROLOGY_HANDOFF.md) | What the GIS layers may and may not say |
| [`GeoJSON/README.md`](GeoJSON/README.md) | Inventory of HydroBASINS, APA, and DEM stream layers |
| [`src/lib/qualityBands.js`](src/lib/qualityBands.js) | Strip scales and legal / WHO bands |
| [Directive (EU) 2020/2184](https://eur-lex.europa.eu/eli/dir/2020/2184/oj) | Parametric values used for colour |
