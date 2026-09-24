"""
Derive a stream network from dem_viana.tif using pysheds.

WHAT IS pysheds?
------------------
A Python library for terrain hydrology analysis — the same family of
operations GIS software like ArcGIS/QGIS's "Hydrology" toolbox does, just
scriptable. It works entirely in Python/numpy, no separate program to install.

THE FOUR STEPS, IN PLAIN LANGUAGE
------------------------------------
1. Fill depressions: raw elevation data has tiny pits and sinks (often just
   measurement noise) that would otherwise trap simulated water and stop it
   from flowing anywhere. This raises those spots just enough that water can
   keep flowing downhill through them.
2. Flow direction: for every 30m cell, work out which of its 8 neighbors is
   the steepest way downhill — that's the direction water flowing across
   that cell would go.
3. Flow accumulation: for every cell, count how many other cells' water
   eventually flows into it, by following the flow directions. A cell with
   high accumulation has a lot of terrain draining through it — that's what
   makes something a stream instead of just a wet hillside.
4. Extract streams by thresholding: pick a minimum accumulation value, and
   keep only the cells at or above it. Lower threshold = more (finer, smaller)
   streams; higher threshold = fewer (only the more substantial channels).
   THRESHOLD, below, is the one number to change to rerun this at a
   different level of detail.

ONE MORE STEP FIRST: REPROJECTION
------------------------------------
dem_viana.tif is in plain lat/lon (degrees), where a "square" pixel isn't
actually square on the ground at this latitude (a degree of longitude covers
less real distance than a degree of latitude, the further from the equator
you get). That would skew "steepest downhill direction" calculations. So we
first reproject the DEM into a metric grid (UTM zone 29N, the standard
projection for mainland Portugal) where every pixel really is ~30m x ~30m,
run the analysis there, then convert the resulting stream lines back to
lat/lon to match your other files.
"""
import os

import numpy as np
import rasterio
from rasterio.warp import calculate_default_transform, reproject, Resampling
import geopandas as gpd
from shapely.geometry import shape
from pysheds.grid import Grid

# ---------------------------------------------------------------------------
# THE ONE SETTING YOU'RE LIKELY TO CHANGE
# ---------------------------------------------------------------------------
THRESHOLD = 300  # minimum flow accumulation (in # of upstream 30m cells) to count as a stream

# ---------------------------------------------------------------------------
INPUT_DEM = "dem_viana.tif"
UTM_DEM = "dem_viana_utm.tif"          # intermediate, reprojected working copy
OUTPUT_GEOJSON = f"dem_streams_t{THRESHOLD}.geojson"  # filename records the threshold used
UTM_CRS = "EPSG:32629"                  # UTM zone 29N — covers mainland Portugal

cell_area_km2 = 30 * 30 / 1_000_000
threshold_km2 = THRESHOLD * cell_area_km2
print(f"Using THRESHOLD = {THRESHOLD} cells  (~{threshold_km2:.2f} km² of contributing "
      f"upslope area needed before a cell counts as a stream)")

print(f"\nStep 1: Reprojecting {INPUT_DEM} to UTM zone 29N (metric, ~30m square pixels) ...")
with rasterio.open(INPUT_DEM) as src:
    transform, width, height = calculate_default_transform(
        src.crs, UTM_CRS, src.width, src.height, *src.bounds, resolution=30
    )
    meta = src.meta.copy()
    meta.update({"crs": UTM_CRS, "transform": transform, "width": width, "height": height})
    with rasterio.open(UTM_DEM, "w", **meta) as dst:
        reproject(
            source=rasterio.band(src, 1),
            destination=rasterio.band(dst, 1),
            src_transform=src.transform, src_crs=src.crs,
            dst_transform=transform, dst_crs=UTM_CRS,
            resampling=Resampling.bilinear,
        )
print(f"  -> Wrote {UTM_DEM} ({width} x {height} pixels, ~30m each)")

print("\nStep 2: Filling depressions and resolving flats ...")
grid = Grid.from_raster(UTM_DEM)
dem = grid.read_raster(UTM_DEM)
pit_filled = grid.fill_pits(dem)
flooded = grid.fill_depressions(pit_filled)
inflated = grid.resolve_flats(flooded)
print("  -> Done.")

print("\nStep 3: Computing flow direction (D8 — steepest of 8 neighbors) ...")
dirmap = (64, 128, 1, 2, 4, 8, 16, 32)
fdir = grid.flowdir(inflated, dirmap=dirmap)
print("  -> Done.")

print("\nStep 4: Computing flow accumulation ...")
acc = grid.accumulation(fdir, dirmap=dirmap)
print(f"  -> Max accumulation in this DEM: {int(acc.max())} cells "
      f"(~{acc.max()*cell_area_km2:.1f} km² — likely the Rio Lima's outlet)")

print(f"\nStep 5: Extracting streams where accumulation >= {THRESHOLD} ...")
stream_mask = acc > THRESHOLD
network = grid.extract_river_network(fdir, stream_mask, dirmap=dirmap)
n_segments = len(network["features"])
print(f"  -> {n_segments} stream segments extracted.")

print(f"\nStep 6: Converting back to lat/lon (EPSG:4326) and saving to {OUTPUT_GEOJSON} ...")
geoms = [shape(f["geometry"]) for f in network["features"]]
gdf = gpd.GeoDataFrame({"seg_id": range(len(geoms))}, geometry=geoms, crs=UTM_CRS)
gdf = gdf.to_crs(epsg=4326)
gdf.to_file(OUTPUT_GEOJSON, driver="GeoJSON")

print("\nDone!")
print(f"Result: {n_segments} stream segments saved to {OUTPUT_GEOJSON}.")
print(f"\nTo rerun at a different level of detail: open derive_streams.py, change")
print(f"THRESHOLD (currently {THRESHOLD}) to a smaller number for MORE/finer streams,")
print(f"or a larger number for FEWER/coarser streams, and run again.")
