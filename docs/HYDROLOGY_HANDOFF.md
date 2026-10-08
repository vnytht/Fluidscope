# WaterScope hydrology notes

Decisions, what the data can and cannot do, what is in the app now, and what not to rebuild.

Related product context: [`PRODUCT_BRIEF.md`](PRODUCT_BRIEF.md).

---

## Goal (product)

When someone taps an added **source pin**, they should understand:

- **What area might affect their source** (uphill surface catchments)
- **What area their source might affect** (downhill surface catchments)
- **Which other sources sit in those areas**
- That this is **landscape / surface catchment**, **not** “this well feeds that river” or “these two wells share an aquifer”

Idle map stays **clean**: basemap + pins only. Hydrology overlay appears **only after tap**.

Living Infrastructure Field Kit (`la.livinginfrastructure.org` site-select / `effect-water-supply`) is a **UX analogue** (select a place → show that place’s water world). Their live tool is invite-only. Steal the *pattern* (area of influence), not LA stormwater models. We do **not** have a runoff-volume raster, so do **not** fake a smooth flow gradient.

---

## Decision log (do not reopen unless asked)

| Topic | Decision |
|---|---|
| MERIT Hydro (~90 m) | **Do not implement.** Same class as existing Copernicus 30 m DEM streams; worse local fit than APA for Portugal. |
| “Check Gaia” | **No Portugal hydrology product named Gaia.** (GIS viewer / Earth Engine mix-up.) Research done. |
| Best official rivers for Viana | **APA / SNIAmb 1:25k** `netElementL` (fetched, clipped). Display-only. **Not** used to link wells. |
| HydroRIVERS orange dashed “source river” | **Removed.** Coarse, offset from OSM; looked like a lie. |
| Pin-to-pin flow arrows | **Do not use.** Read as water crossing fields. |
| Same-basin well-to-well up/down | **Treat as neighbours / peers.** HydroRIVERS snap inside a basin is not trustworthy. |
| MVP overlay | **Three discrete basin zones** + optional **land arrows** from `NEXT_DOWN`. |
| Fake gradient across basins | **No.** Data are chunks, not a continuous runoff field. |

---

## What data we have

Bounding box used in GIS: west −8.90, south 41.55, east −8.10, north 42.15 (Viana do Castelo district). GeoJSON is WGS84.

### Used for **connecting sources** (logic)

| File | Role |
|---|---|
| [`src/data/watershed_viana_district_lev12.geojson`](../src/data/watershed_viana_district_lev12.geojson) | **HydroBASINS L12** — 53 polygons. `HYBAS_ID`, `NEXT_DOWN`, `PFAF_ID`. **This is the backbone.** |

Assignment: point-in-polygon → `HYBAS_ID`.  
Uphill: invert `NEXT_DOWN` (basins that drain *into* this one).  
Downhill: walk `NEXT_DOWN` until `0` or out of file.

**Caveat:** On HydroRIVERS, `HYBAS_L12` vs our polygons’ `HYBAS_ID` agree ~77%. If grouping rivers, use **`HYBAS_ID`** from the spatial join, not `HYBAS_L12`. See [`GeoJSON/README.md`](../GeoJSON/README.md).

### Used internally, **not drawn** as “the well’s river”

| File | Role |
|---|---|
| [`src/data/rivers_flow_network.geojson`](../src/data/rivers_flow_network.geojson) / [`src/data/rivers_by_basin.geojson`](../src/data/rivers_by_basin.geojson) | HydroRIVERS. Code can still snap a pin to a reach (`getHydrologyAssignment`). **Do not draw this as the source river.** Do not use snap to label same-basin pins upstream/downstream. |

### Display-only (optional; **off in current MVP**)

| File | Role |
|---|---|
| [`public/data/apa_rivers_viana.geojson`](../public/data/apa_rivers_viana.geojson) | APA 1:25k official watercourses (~3,631 segments). Regenerate: `python GeoJSON/scripts/get_apa_rivers.py` then copy to `public/data/`. CRS of source shapefile is **EPSG:3763**; clip in projected coords then reproject to 4326. |
| [`public/data/osm_rivers_viana.geojson`](../public/data/osm_rivers_viana.geojson) | OSM rivers/streams/canals. No flow topology. |
| [`public/data/water_bodies_viana.geojson`](../public/data/water_bodies_viana.geojson) | OSM water bodies. |
| [`public/data/dem_streams_t300.geojson`](../public/data/dem_streams_t300.geojson) | Terrain-derived streams from Copernicus 30 m DEM. Visual only. |
| [`src/components/map/DetailedWaterLayer.jsx`](../src/components/map/DetailedWaterLayer.jsx) | Loader for APA/OSM/DEM. **Not mounted in `App.jsx` right now.** |

Heavy GIS originals live under [`GeoJSON/`](../GeoJSON/) (do not need to commit huge zips/tifs; `_cache_*.zip` and `*.tif` are gitignored).

### What **no** dataset gives us

- Exact well → that OSM/APA blue river
- Shared **groundwater** (fractured granite; surface basins ≠ aquifers)
- Travel time / who contaminates whom
- Continuous runoff volume like Living Infrastructure’s LA layers

---

## How sources are connected (current logic)

Implemented in [`src/lib/hydrology.js`](../src/lib/hydrology.js) → `analyzeDownstreamImpact`.

On tap of source **A**:

1. Put A (and every other pin) in a HydroBASINS polygon.
2. **Same `HYBAS_ID`** → `same-basin` (**neighbours**, not up/down).
3. Other pins in **uphill** basins → `upstream` (“might affect A”).
4. Other pins in **downhill** basins → `downstream` (“A might affect that area”).
5. Everyone else → faded, unrelated.

Hydration on add/seed: `hydrateSampleHydrology` in [`src/context/AppStateContext.jsx`](../src/context/AppStateContext.jsx) sets `catchmentId` to real `HYBAS_ID` (legacy mock ids like `catchment-estoraos` still exist on some seed rows; hydrology overwrite should win).

**Coastal trap (already hit in UI):** several town seeds sit in basins with `NEXT_DOWN = 0` and **zero** in-file upstream basins (e.g. `2120019270`, `2120019250`). Overlay is **red only**. That is **correct**, not a colour bug. Purple rings = neighbours in the same polygon.

Inland demo seeds (so 3-zone + arrows can appear):

| id | approx position | basin |
|---|---|---|
| `seed-5` | 41.6236, −8.4912 | `2121213570` (has uphill + downhill) |
| `seed-6` | 41.596, −8.606 | `2121213820` (downhill of 5) |
| `seed-7` | 41.5736, −8.7312 | `2120019210` (further downhill) |

Chain: `2121213570` → `2121213820` → `2120019210` → `0`.

---

## What the map shows now (MVP)

Idle: OSM/Carto tiles + sample dots. No basins, no APA, no arrows.

After tap ([`HydrologyLayer.jsx`](../src/components/map/HydrologyLayer.jsx)):

| Visual | Meaning |
|---|---|
| **Red fill** | This catchment (`origin` `HYBAS_ID`) |
| **Teal fill** | Uphill basins — might affect this source |
| **Amber fill** | Downhill basins — this source might affect this area |
| **➜ on the land** | `NEXT_DOWN` direction between basin centroids (`getBasinFlowArrows`). Not pin-to-pin. Terminal basins (`NEXT_DOWN = 0`) get no arrow. |
| Marker rings | Selected / upstream / same-basin / downstream; unrelated pins at low opacity |

Legend ([`App.jsx`](../src/App.jsx)): only lists teal/amber/arrows if those zones exist.

Drawer ([`SourceDetailSheet.jsx`](../src/components/source/SourceDetailSheet.jsx)): counts for uphill / neighbours / downhill. Isolated-coast copy explains red-only.

---

## Accuracy (for copy and for future features)

| Question | Honest answer |
|---|---|
| Same / different L12 catchment? | Reasonably yes (point-in-polygon). |
| This catchment drains to that one? | Reasonably yes (`NEXT_DOWN`), if both are in the 53-polygon file. |
| This well is upstream of that well in the **same** polygon? | **No** with current data. Peers only. |
| Water follows APA/OSM from A to B? | **No.** |
| Groundwater / contamination path? | **No.** |

Possible later upgrades (not MVP):

1. **DEM point-catchment** from `GeoJSON/dem_viana.tif` — best *surface* “upstream of this well”; still not groundwater.
2. Snap to APA `nextdownid` — better *mapped-river* direction; wrong snap = wrong chain.
3. Faint APA inside the three zones only — landscape context, not topology.

---

## Key files

- [`src/lib/hydrology.js`](../src/lib/hydrology.js) — basins, assignment, up/down analysis, land arrows
- [`src/lib/catchments.js`](../src/lib/catchments.js) — names/colours from `HYBAS_ID`
- [`src/components/map/HydrologyLayer.jsx`](../src/components/map/HydrologyLayer.jsx) — zone fills + land ➜
- [`src/components/map/SampleMarkers.jsx`](../src/components/map/SampleMarkers.jsx) / [`markerIcons.js`](../src/components/map/markerIcons.js)
- [`src/App.jsx`](../src/App.jsx) — overlay gated on selection; no `DetailedWaterLayer`
- [`src/lib/mockData.js`](../src/lib/mockData.js) — seeds including inland `seed-5`–`seed-7`
- [`GeoJSON/scripts/get_apa_rivers.py`](../GeoJSON/scripts/get_apa_rivers.py) — APA clip pipeline
- [`GeoJSON/README.md`](../GeoJSON/README.md) — GIS notes and attribution

---

## Attribution (if layers go public)

- HydroBASINS / HydroRIVERS: Lehner & Grill (2013), HydroSHEDS
- APA / SNIAmb 1:25k geocoded network: CC BY 4.0, Agência Portuguesa do Ambiente
- OSM: © OpenStreetMap contributors, ODbL
- Copernicus DEM / derived streams: Copernicus DEM attribution
