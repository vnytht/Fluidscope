"""
Download APA / SNIAmb 1:25 000 geocoded river network (netElementL) and clip
to the Viana do Castelo district bounding box.

Source: https://dados.gov.pt/en/datasets/rede-hidrografica-geocodificada/
Shapefile: https://sniambgeoviewer.apambiente.pt/GeoDocs/shpzips/netElementL.zip

Output: apa_rivers_viana.geojson (WGS84 line features for web maps)

Attribution (CC BY 4.0): Agência Portuguesa do Ambiente / SNIAmb.
"""
from __future__ import annotations

import sys
import tempfile
import zipfile
from pathlib import Path

import geopandas as gpd
import requests
from shapely.geometry import box

SCRIPT_DIR = Path(__file__).resolve().parent
GEOJSON_DIR = SCRIPT_DIR.parent
ZIP_URL = "https://sniambgeoviewer.apambiente.pt/GeoDocs/shpzips/netElementL.zip"
OUTPUT_GEOJSON = GEOJSON_DIR / "apa_rivers_viana.geojson"
CACHE_ZIP = GEOJSON_DIR / "_cache_netElementL.zip"

BBOX_WEST = -8.90
BBOX_SOUTH = 41.55
BBOX_EAST = -8.10
BBOX_NORTH = 42.15

# Prefer short, stable property names for the web app.
COLUMN_MAP = {
    "featureid": "feature_id",
    "hydroid": "hydro_id",
    "name": "name",
    "stype": "stream_type",
    "streamorde": "stream_order",
    "riverrk": "river_rank",
    "length_": "length_m",
    "st_length_": "length_m",
    "nextdownid": "next_down_id",
    "from_node": "from_node",
    "to_node": "to_node",
}


def download_zip() -> Path:
    if CACHE_ZIP.exists() and CACHE_ZIP.stat().st_size > 1_000_000:
        print(f"Using cached zip: {CACHE_ZIP}")
        return CACHE_ZIP

    print(f"Downloading {ZIP_URL} (~30 MB) ...")
    response = requests.get(ZIP_URL, timeout=120)
    response.raise_for_status()
    CACHE_ZIP.write_bytes(response.content)
    print(f"Saved to {CACHE_ZIP}")
    return CACHE_ZIP


def find_shapefile(zip_path: Path) -> str:
    with zipfile.ZipFile(zip_path) as archive:
        names = [name for name in archive.namelist() if name.lower().endswith(".shp")]
        if not names:
            raise RuntimeError("No .shp found inside netElementL.zip")
        return names[0]


def pick_columns(columns: list[str]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for source, target in COLUMN_MAP.items():
        if source in columns and target not in mapping.values():
            mapping[source] = target
    return mapping


def main() -> None:
    try:
        zip_path = download_zip()
        shp_name = find_shapefile(zip_path)
        print(f"Reading shapefile member: {shp_name}")

        district_wgs84 = box(BBOX_WEST, BBOX_SOUTH, BBOX_EAST, BBOX_NORTH)
        district_proj = (
            gpd.GeoSeries([district_wgs84], crs="EPSG:4326").to_crs(epsg=3763).total_bounds
        )

        with tempfile.TemporaryDirectory() as tmp_dir:
            with zipfile.ZipFile(zip_path) as archive:
                archive.extractall(tmp_dir)
            shp_path = Path(tmp_dir) / Path(shp_name).name
            gdf = gpd.read_file(shp_path, bbox=tuple(district_proj))

        if gdf.crs is None:
            gdf = gdf.set_crs(epsg=3763)

        gdf = gdf.to_crs(epsg=4326)
        clipped = gdf[gdf.intersects(district_wgs84)].copy()
        print(f"Segments inside district bbox: {len(clipped)}")

        rename = pick_columns(list(clipped.columns))
        if rename:
            clipped = clipped.rename(columns=rename)

        keep = [
            c
            for c in [
                "feature_id",
                "hydro_id",
                "name",
                "stream_type",
                "stream_order",
                "river_rank",
                "length_m",
                "next_down_id",
            ]
            if c in clipped.columns
        ]
        final = clipped[keep + ["geometry"]]

        # Drop empty names to keep GeoJSON smaller; tooltip falls back to "Official watercourse".
        if "name" in final.columns:
            final["name"] = final["name"].fillna("").astype(str).str.strip()
            final.loc[final["name"].isin(["", "None", "nan"]), "name"] = None

        final.to_file(OUTPUT_GEOJSON, driver="GeoJSON")
        print(f"Wrote {len(final)} features to {OUTPUT_GEOJSON}")

        if "stream_order" in final.columns:
            counts = final["stream_order"].value_counts().sort_index()
            print("Segments by stream order:")
            for order, count in counts.head(12).items():
                print(f"  {order}: {count}")
    except Exception as error:  # noqa: BLE001 — script entrypoint
        print(f"Error: {error}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
