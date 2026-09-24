"""Abstract contour-band PNG + isoline GeoJSON from the Viana DEM."""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import rasterio
from matplotlib.colors import LinearSegmentedColormap
from rasterio.enums import Resampling
from shapely.geometry import LineString
import geopandas as gpd

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_DIR = SCRIPT_DIR.parent.parent
DEM_PATH = SCRIPT_DIR.parent / "dem_viana.tif"
OUT_PNG = REPO_DIR / "public" / "data" / "viana_elevation.png"
OUT_CONTOURS = REPO_DIR / "public" / "data" / "viana_contours.geojson"

MAX_WIDTH = 1400
LEVELS = [0, 25, 50, 100, 150, 200, 300, 400, 600, 800, 1000, 1300]
LINE_LEVELS = [50, 100, 200, 400, 600, 800, 1000]

CMAP = LinearSegmentedColormap.from_list(
    "iso",
    ["#ffffff", "#d9f4fa", "#9ed7ea", "#7ec8a0", "#d5e878", "#f3ea7a"],
)


def main():
    with rasterio.open(DEM_PATH) as src:
        scale = min(1.0, MAX_WIDTH / src.width)
        height = int(src.height * scale)
        width = int(src.width * scale)
        elev = src.read(1, out_shape=(height, width), resampling=Resampling.bilinear)
        west, south, east, north = src.bounds.left, src.bounds.bottom, src.bounds.right, src.bounds.top

    elev = np.where(elev < 0, 0, elev)
    xs = np.linspace(west, east, width)
    ys = np.linspace(north, south, height)
    xx, yy = np.meshgrid(xs, ys)

    fig, ax = plt.subplots(figsize=(width / 100, height / 100), dpi=100)
    ax.contourf(xx, yy, elev, levels=LEVELS, cmap=CMAP, extend="max", antialiased=True)
    ax.set_xlim(west, east)
    ax.set_ylim(south, north)
    ax.set_axis_off()
    fig.subplots_adjust(0, 0, 1, 1)
    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT_PNG, dpi=100, transparent=True, pad_inches=0)
    plt.close(fig)

    cs = plt.contour(xx, yy, elev, levels=LINE_LEVELS)
    plt.close()
    records = []
    for level, segs in zip(cs.levels, cs.allsegs):
        for seg in segs:
            if len(seg) < 12:
                continue
            records.append({"elev_m": int(level), "geometry": LineString(seg)})
    gdf = gpd.GeoDataFrame(records, crs="EPSG:4326")
    gdf.to_file(OUT_CONTOURS, driver="GeoJSON")
    print(f"Wrote {OUT_PNG} and {len(gdf)} contour lines")


if __name__ == "__main__":
    main()
