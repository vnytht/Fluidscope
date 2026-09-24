"""
Download Copernicus DEM (GLO-30, 30m) tiles covering the Viana do Castelo
district and crop them to the district bounding box.

WHAT IS THE COPERNICUS DEM?
-----------------------------
A global elevation model (how high the ground is, everywhere) built by ESA
from satellite radar, at roughly 30-meter resolution. It's free and public,
hosted here by AWS Open Data with no login needed.

WHAT THIS SCRIPT DOES
-----------------------
1. Downloads the two 1-degree-by-1-degree elevation tiles that together
   cover the bounding box (the box straddles the 42N tile boundary, so we
   need two neighboring tiles, not one).
2. "Mosaics" them — stitches the two tiles into one continuous grid.
3. Crops that grid down to the exact district bounding box.
4. Saves the cropped result as dem_viana.tif.

The two raw downloaded tiles are kept (not deleted) in raw_dem_tiles/ so you
can double check the cropped result against them before removing them.
"""
import os
import sys
import urllib.request

import rasterio
from rasterio.merge import merge
from rasterio.mask import mask
from shapely.geometry import box

OUTPUT_TIF = "dem_viana.tif"
RAW_DIR = "raw_dem_tiles"

BBOX_WEST = -8.90
BBOX_SOUTH = 41.55
BBOX_EAST = -8.10
BBOX_NORTH = 42.15

# The two Copernicus DEM tiles that cover this bounding box, on AWS Open Data
TILE_NAMES = [
    "Copernicus_DSM_COG_10_N41_00_W009_00_DEM",
    "Copernicus_DSM_COG_10_N42_00_W009_00_DEM",
]
BASE_URL = "https://copernicus-dem-30m.s3.amazonaws.com"

os.makedirs(RAW_DIR, exist_ok=True)

print("Step 1: Downloading the two Copernicus DEM tiles that cover this area ...")
tile_paths = []
for name in TILE_NAMES:
    url = f"{BASE_URL}/{name}/{name}.tif"
    dest = os.path.join(RAW_DIR, f"{name}.tif")
    tile_paths.append(dest)
    if os.path.exists(dest):
        print(f"  -> {dest} already downloaded, skipping.")
        continue
    print(f"  -> Downloading {url} ...")
    try:
        urllib.request.urlretrieve(url, dest)
    except Exception as e:
        print(f"\nDownload failed: {e}")
        sys.exit(1)
    size_mb = os.path.getsize(dest) / 1024 / 1024
    print(f"     Saved {dest} ({size_mb:.1f} MB)")

print("\nStep 2: Mosaicking the two tiles into one continuous elevation grid ...")
srcs = [rasterio.open(p) for p in tile_paths]
mosaic, mosaic_transform = merge(srcs)
mosaic_crs = srcs[0].crs
print(f"  -> Combined grid shape: {mosaic.shape[1]} rows x {mosaic.shape[2]} cols")

print("\nStep 3: Cropping to the district bounding box ...")
bbox_geom = [box(BBOX_WEST, BBOX_SOUTH, BBOX_EAST, BBOX_NORTH)]

# write the mosaic to a temporary in-memory-like dataset so we can crop it
from rasterio.io import MemoryFile
meta = srcs[0].meta.copy()
meta.update({
    "height": mosaic.shape[1],
    "width": mosaic.shape[2],
    "transform": mosaic_transform,
})
for s in srcs:
    s.close()

with MemoryFile() as memfile:
    with memfile.open(**meta) as dataset:
        dataset.write(mosaic)
        cropped, cropped_transform = mask(dataset, bbox_geom, crop=True)
        cropped_meta = dataset.meta.copy()

cropped_meta.update({
    "height": cropped.shape[1],
    "width": cropped.shape[2],
    "transform": cropped_transform,
})

print(f"  -> Cropped grid shape: {cropped.shape[1]} rows x {cropped.shape[2]} cols")

print(f"\nStep 4: Saving to {OUTPUT_TIF} ...")
with rasterio.open(OUTPUT_TIF, "w", **cropped_meta) as dst:
    dst.write(cropped)

size_mb = os.path.getsize(OUTPUT_TIF) / 1024 / 1024
print("\nDone!")
print(f"Result: {OUTPUT_TIF} ({size_mb:.1f} MB), covering the district bounding box.")
print(f"Elevation range in this area: {cropped.min():.1f}m to {cropped.max():.1f}m")
print(f"\nRaw tiles kept in {RAW_DIR}/ for you to double check against — "
      f"let me know once you've confirmed dem_viana.tif looks right, and I'll delete them.")
