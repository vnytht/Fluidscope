"""
Download OpenStreetMap waterways (rivers, streams, canals) for the Viana do
Castelo district, using OSMnx.

WHY OSMnx
----------
OSMnx wraps the Overpass API (the query service for OpenStreetMap data) and
hands back a ready-to-use geopandas GeoDataFrame — same kind of object the
HydroBASINS/HydroRIVERS scripts already produced. It builds the Overpass
query for you and handles the response parsing, so there's no raw JSON to
pick apart by hand.

WHAT THIS SCRIPT DOES
----------------------
1. Asks Overpass (OSM's live database) for every way tagged waterway=river,
   waterway=stream, or waterway=canal inside the district bounding box.
2. Keeps just the `name` and `waterway` fields, plus geometry.
3. Saves the result as osm_rivers_viana.geojson.

NOTE ON WHAT OSM WATERWAYS ARE (AND AREN'T)
---------------------------------------------
These are mapped by volunteers tracing streams from imagery/GPS — great for
visual detail near villages, especially little streams HydroRIVERS skips.
But unlike HydroBASINS/HydroRIVERS, OSM ways carry no flow direction or
basin topology — there's no NEXT_DOWN equivalent. Keep using HydroBASINS
for any upstream/downstream logic; OSM is purely for map detail.
"""
import sys

OUTPUT_GEOJSON = "osm_rivers_viana.geojson"

# Same bounding box used for the basins and HydroRIVERS clips
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

# Give the Overpass server (and our own request) a generous window before
# giving up, since this bounding box is fairly large.
ox.settings.requests_timeout = 300

print("Step 1: Asking OpenStreetMap (via Overpass) for rivers, streams and canals")
print("        in the district bounding box. This can take anywhere from a few")
print("        seconds to a couple of minutes depending on the Overpass server's")
print("        current load — please wait...")

bbox = (BBOX_WEST, BBOX_SOUTH, BBOX_EAST, BBOX_NORTH)  # (west, south, east, north)
tags = {"waterway": ["river", "stream", "canal"]}

try:
    gdf = ox.features_from_bbox(bbox=bbox, tags=tags)
except Exception as e:
    print(f"\nThe download failed or timed out: {e}")
    print(
        "\nNext step would be to split the bounding box into smaller tiles and "
        "merge them — let me know and I'll set that up rather than retrying "
        "the same large request."
    )
    sys.exit(1)

print(f"  -> Got {len(gdf)} OSM features back.")

print("Step 2: Keeping only geometry types that make sense for waterways (lines) ...")
geom_types = gdf.geom_type.value_counts()
print("  -> Geometry types returned:")
for gt, n in geom_types.items():
    print(f"     {gt}: {n}")
gdf = gdf[gdf.geom_type.isin(["LineString", "MultiLineString"])]
print(f"  -> {len(gdf)} line features remain.")

print("Step 3: Checking coordinate system is WGS84 lat/lon (EPSG:4326) ...")
if gdf.crs is None:
    print("  -> No CRS found; OSMnx returns EPSG:4326 by default, setting it explicitly.")
    gdf = gdf.set_crs(epsg=4326)
elif gdf.crs.to_epsg() != 4326:
    print(f"  -> Reprojecting from {gdf.crs} to EPSG:4326 ...")
    gdf = gdf.to_crs(epsg=4326)
else:
    print("  -> Already EPSG:4326. Good.")

print("Step 4: Keeping only the useful columns ...")
existing_cols = [c for c in KEEP_COLUMNS if c in gdf.columns]
missing_cols = [c for c in KEEP_COLUMNS if c not in gdf.columns]
if missing_cols:
    print(f"  -> Note: these columns weren't found and will be skipped: {missing_cols}")
final = gdf[existing_cols + ["geometry"]].reset_index(drop=True)
print(f"  -> Keeping columns: {existing_cols + ['geometry']}")

named = final["name"].notna().sum() if "name" in final.columns else 0
print(f"  -> {named} of {len(final)} features have a name tag; the rest are unnamed segments.")

print(f"Step 5: Saving to {OUTPUT_GEOJSON} ...")
final.to_file(OUTPUT_GEOJSON, driver="GeoJSON")

print("\nDone!")
print(f"Result: {len(final)} OSM waterway features saved to {OUTPUT_GEOJSON}.")

if "waterway" in final.columns:
    print("\nBreakdown by waterway type:")
    for wtype, n in final["waterway"].value_counts().items():
        print(f"  {wtype}: {n}")
