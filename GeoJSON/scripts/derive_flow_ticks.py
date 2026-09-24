"""
Sparse downhill ticks from Copernicus DEM (option D).

For every Nth land cell, draw a short line toward the steepest of 8 neighbours.
Visual only — not a stream network and not well-to-well flow.
"""
from pathlib import Path

import numpy as np
import rasterio
from rasterio.warp import Resampling, calculate_default_transform, reproject
from shapely.geometry import LineString
import geopandas as gpd

SCRIPT_DIR = Path(__file__).resolve().parent
GEOJSON_DIR = SCRIPT_DIR.parent
INPUT_DEM = GEOJSON_DIR / "dem_viana.tif"
OUTPUT = GEOJSON_DIR / "dem_flow_ticks.geojson"
UTM_CRS = "EPSG:32629"

STEP = 12
TICK_M = 220
MIN_SLOPE = 0.012
MIN_ELEV_M = 2.0

NEIGHBORS = (
    (-1, 0),
    (-1, 1),
    (0, 1),
    (1, 1),
    (1, 0),
    (1, -1),
    (0, -1),
    (-1, -1),
)


def load_metric_dem():
    with rasterio.open(INPUT_DEM) as src:
        transform, width, height = calculate_default_transform(
            src.crs, UTM_CRS, src.width, src.height, *src.bounds, resolution=30
        )
        dem = np.empty((height, width), dtype=np.float32)
        reproject(
            source=rasterio.band(src, 1),
            destination=dem,
            src_transform=src.transform,
            src_crs=src.crs,
            dst_transform=transform,
            dst_crs=UTM_CRS,
            resampling=Resampling.bilinear,
        )
        nodata = src.nodata
    if nodata is not None:
        dem[dem == nodata] = np.nan
    dem[dem < -100] = np.nan
    return dem, transform


def main():
    dem, transform = load_metric_dem()
    height, width = dem.shape
    rows = np.arange(STEP // 2, height - 1, STEP)
    cols = np.arange(STEP // 2, width - 1, STEP)
    lines = []

    for row in rows:
        for col in cols:
            z = dem[row, col]
            if not np.isfinite(z) or z < MIN_ELEV_M:
                continue
            best_drop = 0.0
            best = None
            for dr, dc in NEIGHBORS:
                nr, nc = row + dr, col + dc
                if nr < 0 or nc < 0 or nr >= height or nc >= width:
                    continue
                zn = dem[nr, nc]
                if not np.isfinite(zn):
                    continue
                dist = 30.0 * (1.41421356 if dr and dc else 1.0)
                drop = (z - zn) / dist
                if drop > best_drop:
                    best_drop = drop
                    best = (nr, nc)
            if best is None or best_drop < MIN_SLOPE:
                continue
            x0, y0 = rasterio.transform.xy(transform, row, col)
            x1, y1 = rasterio.transform.xy(transform, best[0], best[1])
            dx, dy = x1 - x0, y1 - y0
            length = (dx * dx + dy * dy) ** 0.5
            if length < 1:
                continue
            scale = TICK_M / length
            lines.append(LineString([(x0, y0), (x0 + dx * scale, y0 + dy * scale)]))

    gdf = gpd.GeoDataFrame({"tick_id": range(len(lines))}, geometry=lines, crs=UTM_CRS)
    gdf = gdf.to_crs(epsg=4326)
    gdf.to_file(OUTPUT, driver="GeoJSON")
    print(f"Wrote {len(gdf)} ticks to {OUTPUT}")


if __name__ == "__main__":
    main()
