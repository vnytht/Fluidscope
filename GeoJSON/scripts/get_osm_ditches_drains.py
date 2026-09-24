"""
Download OSM ditches and drains for the Viana do Castelo district, as two
separate layers from the river/stream/canal layer already saved.

WHY SEPARATE FILES
-------------------
Ditches and drains are small, often agricultural, engineered channels —
different in character from natural streams/rivers, and much more unevenly
mapped (dense in some parishes, absent in others). Keeping them as their own
layers means you can toggle them on/off independently in QGIS/Leaflet rather
than have them blend into the main waterway layer.

WHAT THIS SCRIPT DOES
----------------------
1. Asks Overpass for both waterway=ditch and waterway=drain in one request
   (cheaper than two separate downloads).
2. Splits the result into two GeoDataFrames by tag value.
3. Saves them as osm_ditches_viana.geojson and osm_drains_viana.geojson.
"""
import sys

OUTPUT_DITCHES = "osm_ditches_viana.geojson"
OUTPUT_DRAINS = "osm_drains_viana.geojson"

# Same bounding box used throughout
BBOX_WEST = -8.90
BBOX_SOUTH = 41.55
BBOX_EAST = -8.10
BBOX_NORTH = 42.15

KEEP_COLUMNS = ["name", "waterway"]

try:
    import osmnx as ox
except ImportError:
    print(
        "osmnx isn't installed yet.\n"
        "Install it first, then run this script again:\n\n"
        "    pip install osmnx\n"
    )
    sys.exit(1)

ox.settings.requests_timeout = 300

print("Step 1: Asking OpenStreetMap for ditches and drains in the district")
print("        bounding box. Please wait...")

bbox = (BBOX_WEST, BBOX_SOUTH, BBOX_EAST, BBOX_NORTH)
tags = {"waterway": ["ditch", "drain"]}

try:
    gdf = ox.features_from_bbox(bbox=bbox, tags=tags)
except Exception as e:
    print(f"\nThe download failed or timed out: {e}")
    sys.exit(1)

print(f"  -> Got {len(gdf)} OSM features back.")

print("Step 2: Keeping only line geometries ...")
geom_types = gdf.geom_type.value_counts()
print("  -> Geometry types returned:")
for gt, n in geom_types.items():
    print(f"     {gt}: {n}")
gdf = gdf[gdf.geom_type.isin(["LineString", "MultiLineString"])]
print(f"  -> {len(gdf)} line features remain.")

print("Step 3: Checking coordinate system is WGS84 lat/lon (EPSG:4326) ...")
if gdf.crs is None:
    gdf = gdf.set_crs(epsg=4326)
    print("  -> No CRS found; set to EPSG:4326.")
elif gdf.crs.to_epsg() != 4326:
    gdf = gdf.to_crs(epsg=4326)
    print(f"  -> Reprojected to EPSG:4326.")
else:
    print("  -> Already EPSG:4326. Good.")

print("Step 4: Keeping only the useful columns ...")
existing_cols = [c for c in KEEP_COLUMNS if c in gdf.columns]
missing_cols = [c for c in KEEP_COLUMNS if c not in gdf.columns]
if missing_cols:
    print(f"  -> Note: these columns weren't found and will be skipped: {missing_cols}")
gdf = gdf[existing_cols + ["geometry"]].reset_index(drop=True)

print("Step 5: Splitting into two layers by waterway type ...")
ditches = gdf[gdf["waterway"] == "ditch"].reset_index(drop=True)
drains = gdf[gdf["waterway"] == "drain"].reset_index(drop=True)
print(f"  -> {len(ditches)} ditch features, {len(drains)} drain features.")

print(f"Step 6: Saving {OUTPUT_DITCHES} and {OUTPUT_DRAINS} ...")
if len(ditches):
    ditches.to_file(OUTPUT_DITCHES, driver="GeoJSON")
else:
    print(f"  -> No ditches found in this area; not writing {OUTPUT_DITCHES}.")
if len(drains):
    drains.to_file(OUTPUT_DRAINS, driver="GeoJSON")
else:
    print(f"  -> No drains found in this area; not writing {OUTPUT_DRAINS}.")

print("\nDone!")
print(f"Result: {len(ditches)} ditch feature(s) -> {OUTPUT_DITCHES}")
print(f"        {len(drains)} drain feature(s) -> {OUTPUT_DRAINS}")
print(f"        (osm_rivers_viana.geojson, with river/stream/canal, is untouched)")
