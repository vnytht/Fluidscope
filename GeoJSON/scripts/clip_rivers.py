"""
Clip HydroRIVERS (Europe) to the Viana do Castelo district bounding box.

WHAT THIS SCRIPT DOES
----------------------
1. Reads the HydroRIVERS river-network layer for Europe. It's a big dataset
   (~940,000 river segments for all of Europe), so we filter to the bounding
   box *while reading* rather than loading everything into memory first.
2. Confirms it's in WGS84 lat/lon (EPSG:4326) — same check as the basin script.
3. Clips (trims) the lines exactly to the district bounding box, same box used
   for the level-12 basins.
4. Keeps HYRIV_ID (unique segment id), ORD_STRA (Strahler stream order — more
   on that below), and HYBAS_L12 (the level-12 basin HydroSHEDS itself already
   assigned each segment to — handy as a cross-check for step 2).
5. Saves the result as rivers_viana.geojson.

WHAT IS ORD_STRA (STREAM ORDER)?
---------------------------------
Strahler stream order is a standard way to rank how "major" a stream is,
based on how many smaller streams feed into it:
  - Order 1: a small headwater stream with no tributaries.
  - Order 2: formed where two order-1 streams join.
  - Order 3+: formed where two streams of the same order join, and so on.
A river like the Lima will have a high order near its mouth and low orders
in its tiny mountain headwaters. If your map feels cluttered with countless
tiny streams, you can filter to ORD_STRA >= 3 (or 4) later to show only the
more significant channels.
"""
import os
import sys

INPUT_GDB = os.path.expanduser(
    "~/Downloads/HydroRIVERS_v10_eu.gdb/HydroRIVERS_v10_eu.gdb"
)
LAYER = "HydroRIVERS_v10_eu"
OUTPUT_GEOJSON = "rivers_viana.geojson"

# Same bounding box used for the level-12 basins (west, south, east, north)
BBOX_WEST = -8.90
BBOX_SOUTH = 41.55
BBOX_EAST = -8.10
BBOX_NORTH = 42.15

KEEP_COLUMNS = ["HYRIV_ID", "ORD_STRA", "HYBAS_L12"]

try:
    import geopandas as gpd
except ImportError:
    print(
        "geopandas isn't installed yet.\n"
        "Install it first, then run this script again:\n\n"
        "    pip install geopandas shapely\n"
    )
    sys.exit(1)

print(f"Step 1: Reading {LAYER} from the geodatabase, filtered to the bounding box ...")
print("  (this only pulls in segments near the district, not all 938,544 of Europe's)")
bbox = (BBOX_WEST, BBOX_SOUTH, BBOX_EAST, BBOX_NORTH)
gdf = gpd.read_file(INPUT_GDB, layer=LAYER, bbox=bbox)
print(f"  -> Loaded {len(gdf)} river segments near the bounding box.")

print("Step 2: Checking the coordinate system is WGS84 lat/lon (EPSG:4326) ...")
if gdf.crs is None:
    print("  -> No CRS found; assuming EPSG:4326 (HydroRIVERS default).")
    gdf = gdf.set_crs(epsg=4326)
elif gdf.crs.to_epsg() != 4326:
    print(f"  -> File is in {gdf.crs}, reprojecting to EPSG:4326 ...")
    gdf = gdf.to_crs(epsg=4326)
else:
    print("  -> Already in EPSG:4326. Good.")

print("Step 3: Clipping lines exactly to the district bounding box ...")
clipped = gdf.clip(gpd.GeoSeries.from_wkt(
    [f"POLYGON(({BBOX_WEST} {BBOX_SOUTH}, {BBOX_EAST} {BBOX_SOUTH}, "
     f"{BBOX_EAST} {BBOX_NORTH}, {BBOX_WEST} {BBOX_NORTH}, {BBOX_WEST} {BBOX_SOUTH}))"],
    crs="EPSG:4326"
))
print(f"  -> {len(clipped)} river segment(s) fall inside the bounding box.")

print("Step 4: Keeping only the useful columns ...")
existing_cols = [c for c in KEEP_COLUMNS if c in clipped.columns]
missing_cols = [c for c in KEEP_COLUMNS if c not in clipped.columns]
if missing_cols:
    print(f"  -> Note: these columns weren't found and will be skipped: {missing_cols}")
final = clipped[existing_cols + ["geometry"]]
print(f"  -> Keeping columns: {existing_cols + ['geometry']}")

print(f"Step 5: Saving to {OUTPUT_GEOJSON} ...")
final.to_file(OUTPUT_GEOJSON, driver="GeoJSON")

print("\nDone!")
print(f"Result: {len(final)} river segment(s) saved to {OUTPUT_GEOJSON}.")

if "ORD_STRA" in final.columns:
    counts = final["ORD_STRA"].value_counts().sort_index()
    print("\nSegments by stream order (1 = smallest headwater streams):")
    for order, n in counts.items():
        print(f"  order {order}: {n} segments")
