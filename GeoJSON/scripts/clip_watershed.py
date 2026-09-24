"""
Clip a HydroBASINS level to a bounding box around Viana do Castelo, Portugal.

WHAT THIS SCRIPT DOES, STEP BY STEP
------------------------------------
1. Reads the HydroBASINS shapefile for the chosen Pfafstetter LEVEL.
2. Makes sure the data is in plain lat/lon coordinates (WGS84 / EPSG:4326) —
   HydroBASINS ships in this projection already, but we check rather than assume.
3. "Clips" (crops) it down to just the basins that fall inside a bounding box
   drawn around the Viana do Castelo district.
4. Drops every column except the ones you actually need for building an
   upstream/downstream river tree, plus the basin shape itself.
5. Saves the cropped result as a small GeoJSON file, ready to drop onto a
   Leaflet map.

HOW TO RE-RUN FOR A DIFFERENT LEVEL
------------------------------------
Change the LEVEL number below (e.g. 8 -> 10 -> 12) and run the script again.
Each level writes to its own output file, so nothing gets overwritten and you
don't need to re-download anything — all levels are already in this folder.
"""

import sys

# ---------------------------------------------------------------------------
# THE ONE SETTING YOU'RE LIKELY TO CHANGE
# ---------------------------------------------------------------------------
LEVEL = 12  # Pfafstetter level: try 10 or 12 if level 8 gives too few basins

# ---------------------------------------------------------------------------
# Everything below is built from LEVEL automatically — no need to edit it.
# ---------------------------------------------------------------------------
LEVEL_STR = f"{LEVEL:02d}"  # e.g. 8 -> "08", 12 -> "12"
INPUT_SHAPEFILE = f"hybas_lake_eu_lev{LEVEL_STR}_v1c.shp"
OUTPUT_GEOJSON = f"watershed_viana_district_lev{LEVEL_STR}.geojson"

# Bounding box around the whole Viana do Castelo district — all ten
# municipalities, Atlantic coast to the Spanish border, Braga border to the
# Rio Minho (west, south, east, north)
BBOX_WEST = -8.90
BBOX_SOUTH = 41.55
BBOX_EAST = -8.10
BBOX_NORTH = 42.15

# Columns we want to keep, if they exist in the file
KEEP_COLUMNS = ["HYBAS_ID", "NEXT_DOWN", "PFAF_ID", "SUB_AREA"]

try:
    import geopandas as gpd
except ImportError:
    print(
        "geopandas isn't installed yet.\n"
        "Install it first, then run this script again:\n\n"
        "    pip install geopandas shapely\n"
    )
    sys.exit(1)

print(f"Step 1: Reading {INPUT_SHAPEFILE} ...")
gdf = gpd.read_file(INPUT_SHAPEFILE)
print(f"  -> Loaded {len(gdf)} basins for the whole Europe level-{LEVEL_STR} layer.")

print("Step 2: Checking the coordinate system is WGS84 lat/lon (EPSG:4326) ...")
if gdf.crs is None:
    print("  -> No CRS found on the file; assuming it's already EPSG:4326 (HydroBASINS default).")
    gdf = gdf.set_crs(epsg=4326)
elif gdf.crs.to_epsg() != 4326:
    print(f"  -> File is in {gdf.crs}, reprojecting to EPSG:4326 ...")
    gdf = gdf.to_crs(epsg=4326)
else:
    print("  -> Already in EPSG:4326. Good.")

print("Step 3: Clipping to the Viana do Castelo bounding box ...")
bbox = (BBOX_WEST, BBOX_SOUTH, BBOX_EAST, BBOX_NORTH)
clipped = gdf.clip(gpd.GeoSeries.from_wkt(
    [f"POLYGON(({BBOX_WEST} {BBOX_SOUTH}, {BBOX_EAST} {BBOX_SOUTH}, "
     f"{BBOX_EAST} {BBOX_NORTH}, {BBOX_WEST} {BBOX_NORTH}, {BBOX_WEST} {BBOX_SOUTH}))"],
    crs="EPSG:4326"
))
print(f"  -> {len(clipped)} basin(s) fall inside the bounding box.")

print("Step 4: Keeping only the useful columns ...")
existing_cols = [c for c in KEEP_COLUMNS if c in clipped.columns]
missing_cols = [c for c in KEEP_COLUMNS if c not in clipped.columns]
if missing_cols:
    print(f"  -> Note: these columns weren't found in the file and will be skipped: {missing_cols}")
final = clipped[existing_cols + ["geometry"]]
print(f"  -> Keeping columns: {existing_cols + ['geometry']}")

print(f"Step 5: Saving to {OUTPUT_GEOJSON} ...")
final.to_file(OUTPUT_GEOJSON, driver="GeoJSON")

print("\nDone!")
print(f"Result: {len(final)} basin(s) saved to {OUTPUT_GEOJSON} (level {LEVEL_STR}).")

if len(final) <= 2:
    print(
        "\nHeads up: only 1-2 basins matched at this level. If you need more detail\n"
        f"around Estorãos, open this file and change LEVEL = {LEVEL} to LEVEL = 10 (or 12)\n"
        "near the top of the script, then run it again."
    )
