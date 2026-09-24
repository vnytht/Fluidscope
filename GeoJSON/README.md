# Viana do Castelo Watershed & River Data — Notes for You

Hi! This folder has all the basin/river/stream data for the Viana do Castelo
district that we'll be building the map feature on top of. It comes from a
few different hydrology data sources, so this doc explains what each file
is, how they relate to each other, and a few rough edges to know about
before you start wiring them into the app.

**Bounding box used for every layer here:** west −8.90, south 41.55, east
−8.10, north 42.15 — that's all ten municipalities of the district: Atlantic
coast in the west, the Spanish border in the mountainous east, the Braga
district border to the south, and the Rio Minho up north.

**Coordinate system:** every `.geojson` file here is plain lat/lon (WGS84,
EPSG:4326) — the standard for web maps, so you can load these straight into
Leaflet with no reprojection step.

---

## The three "families" of data, and why there are three

We layered three different sources on top of each other, because each one
is good at a different thing:

1. **HydroBASINS** — the watershed polygons. This is the one with real
   hydrological topology (which basin flows into which), so it's the
   backbone for any upstream/downstream logic in the app.
2. **HydroRIVERS** — the major named rivers, derived the same official way
   as the basins. Good and consistent, but coarse — it only maps rivers big
   enough to matter at a large scale, so a lot of small streams near
   villages just aren't in it.
3. **OpenStreetMap waterways** and **DEM-derived streams** — two different
   ways of filling in that missing detail. OSM is what people have actually
   mapped by hand (so it's patchy — great where someone's mapped the local
   stream, empty where no one has). The DEM-derived streams are instead
   *computed* from raw elevation data (basically: "where would water flow,
   given the shape of the land"), so they cover the whole district evenly,
   at whatever density we choose.

**Important distinction for your logic:** only the HydroBASINS layer (and
HydroRIVERS, which we tagged with basin IDs — see below) carries real flow
direction/topology. OSM and the DEM streams are visual/surface detail only —
please don't use them to compute anything upstream/downstream of anything
else. They're there to make the map look right at a village scale, not to
reason about hydrology.

---

## Files

| File | What it is | Features | Key fields |
|---|---|---|---|
| `watershed_viana_district_lev12.geojson` | Basin polygons (Pfafstetter level 12 — a HydroBASINS thing, basically "how zoomed-in the sub-basin boundaries are"; level 12 is fine enough to be interesting without being visual noise) | 53 | `HYBAS_ID`, `NEXT_DOWN`, `PFAF_ID`, `SUB_AREA` (km²) |
| `rivers_by_basin.geojson` | Major river lines (HydroRIVERS), each one tagged with which basin it's inside | 521 | `HYRIV_ID`, `ORD_STRA` (stream order, see below), `HYBAS_L12` (see caveat below — don't use this one), `HYBAS_ID` (**use this one** for basin filtering) |
| `apa_rivers_viana.geojson` | **Official APA / SNIAmb 1:25k geocoded river network** (best river overlay for Portugal) | 3,631 | `name`, `stream_order`, `river_rank`, `hydro_id`, `next_down_id` |
| `osm_rivers_viana.geojson` | OpenStreetMap rivers/streams/canals | 4,765 | `name`, `waterway` (`river` / `stream` / `canal`) |
| `osm_ditches_viana.geojson` | OSM ditches — small, patchy | 84 | `name`, `waterway` |
| `osm_drains_viana.geojson` | OSM drains — same caveat as ditches | 71 | `name`, `waterway` |
| `dem_streams_t1000.geojson` | Streams computed from elevation — coarsest of the three | 2,475 | `seg_id` |
| `dem_streams_t500.geojson` | Same, medium detail | 5,034 | `seg_id` |
| `dem_streams_t300.geojson` | Same, finest detail | 8,234 | `seg_id` |
| `land_mask_viana.geojson` | A land-vs-ocean shape for the district, built as a side effect of cleaning up the DEM streams near the coast (see below) — might be handy on its own, e.g. to mask other layers or style the ocean differently | 1 polygon | `name` |
| `dem_viana.tif` | The cropped elevation raster itself (Copernicus DEM, 30m), in case elevation/hillshade features come up later | — | one elevation band, in meters |
| `HydroBASINS_TechDoc_v1c.pdf` | Official field reference from HydroSHEDS, if you ever need to look up what a field means in more depth | — | — |
| `scripts/get_apa_rivers.py` | Downloads SNIAmb `netElementL.zip`, clips to district, writes `apa_rivers_viana.geojson` | — | needs `pip install geopandas requests` |
| `scripts/` | Other Python scripts that generated the remaining files above | — | — |

**All three `dem_streams_t*.geojson` files are legitimate options, not a
single final answer** — pick whichever density looks right once it's on the
map. Lower number in the filename = more detail = more segments.

---

## How the basin ↔ river relationship works

Think of `HYBAS_ID` / `NEXT_DOWN` on the basins file as a tree: each basin's
`NEXT_DOWN` value is the `HYBAS_ID` of the basin *it* drains into.
`NEXT_DOWN = 0` means that basin drains straight out (river mouth or coast,
no further basin downstream of it in the dataset). Walk that chain in either
direction and you get everything upstream or downstream of any given basin —
that's the whole engine for any "what's upstream of here" feature.

`rivers_by_basin.geojson` has a matching `HYBAS_ID` on every segment (we
spatially joined it against these exact basin polygons), so something like
`rivers.filter(HYBAS_ID == X)` gives you exactly the rivers inside basin X.

## What "stream order" (`ORD_STRA`) means

It's a simple way of ranking how major a stream is, based on how many
tributaries feed into it: order 1 is a small headwater stream with nothing
feeding into it; order 2 forms where two order-1 streams join; order 3 where
two order-2s join, and so on. If a layer feels too busy with tiny streams,
filtering to `ORD_STRA >= 3` (or higher) is an easy way to thin it out to
just the more substantial channels.

## Where the DEM streams come from, and the ocean-cleanup step

`dem_streams_t*.geojson` were computed from the 30m elevation model: fill in
tiny pits/noise → figure out which way water flows off each cell → count how
much land drains through each cell → keep only the cells above some minimum
(that minimum is the number in the filename, in "how many upstream 30m
cells feed into it").

The raw elevation data over open ocean has some sensor noise in it, which
originally made the flow-direction step invent nonsense, tangled paths over
open water near the coast. That's fixed now: the ocean area is masked out
before the flow analysis runs, and every resulting line is trimmed against
an actual land shape afterward as a second safety pass — so none of these
files should show streams sitting out over water. If you spot one that
still does, that's worth flagging back — screenshot the spot and we'll dig
into it further.

## Known caveats

- **`HYBAS_L12` vs `HYBAS_ID`** on `rivers_by_basin.geojson`: HydroRIVERS
  ships with its own basin tag (`HYBAS_L12`), but it refers to a slightly
  different HydroBASINS product than the one we're using (ours includes
  lake/reservoir handling that shifts some basin boundaries). The two fields
  agree about 77% of the time; use `HYBAS_ID`, not `HYBAS_L12` — it was
  computed directly against these basin polygons.
- **OSM coverage is uneven** — dense wherever a local contributor has mapped
  a stream, empty elsewhere. Treat it as bonus detail, not full coverage.
- **The DEM streams are surface drainage from terrain shape only** — a
  reasonable stand-in for "what the landscape looks like," but not a
  scientifically validated river network (this area's real hydrology runs
  partly through fractured granite, which surface terrain alone can't
  capture). Fine for visuals, not for claiming anything about actual water
  flow beyond what's already in the HydroBASINS/HydroRIVERS data.

## Attribution — check before this goes live publicly

Three different providers, three sets of terms — worth a quick look at each
one's current license page before shipping, but as of now:

- **HydroBASINS / HydroRIVERS** (HydroSHEDS — WWF & McGill University): cite
  Lehner, B., Grill G. (2013), *Hydrological Processes* 27(15). Free for
  commercial and non-commercial use with attribution.
- **APA geocoded river network** (`apa_rivers_viana.geojson`): Agência
  Portuguesa do Ambiente / SNIAmb, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **OpenStreetMap** (the `osm_*.geojson` files): © OpenStreetMap
  contributors, Open Database License (ODbL) — needs a visible "©
  OpenStreetMap contributors" credit wherever it's shown, and redistributing
  the raw data further may carry share-alike obligations.
- **Copernicus DEM** (`dem_viana.tif` and everything derived from it):
  requires an attribution along the lines of "Contains Copernicus DEM data."

## If you need to regenerate or tweak anything

Every file here came from one of the scripts in `scripts/`, and each script
has the one setting that actually matters clearly labeled near the top
(basin detail level, stream thresholds, the bounding box). If the area needs
to change, or you want a level of detail we didn't generate, those scripts
can just be rerun rather than redone from scratch — ping me if you want to
change something and aren't sure which script/setting controls it.
